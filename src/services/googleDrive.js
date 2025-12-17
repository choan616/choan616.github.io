/**
 * Google Drive 동기화 서비스
 * Google Identity Services (GIS) 및 Google Drive API v3 사용
 */
import JSZip from 'jszip';

// 환경 변수에서 Google API 자격증명 로드
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// 환경 변수가 설정되지 않은 경우 명확한 에러 메시지 표시
if (!CLIENT_ID || !API_KEY) {
  console.error('Google API credentials are missing!');
  console.error('Please create a .env file with VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY');
  console.error('See .env.example for template');
}

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Diary2Backup';
const BACKUP_FILE_PREFIX = 'diary_backup_';
const MAX_BACKUPS_TO_KEEP = 20; // 유지할 최대 백업 개수

class GoogleDriveService {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.tokenExpiresAt = null; // 토큰 만료 시간
    this.gapiInited = false;
    this.gisInited = false;

    // 이벤트 리스너를 위한 콜백 배열
    this.authListeners = [];
  }

  /**
   * Google API 및 GIS 클라이언트 초기화
   * @returns {Promise<void>}
   */
  async initClient() {
    try {
      await Promise.all([
        this.loadGapiScript(),
        this.loadGisScript()
      ]);

      console.log('Google API scripts loaded');
    } catch (error) {
      console.error('Failed to load Google API scripts:', error);
      throw error;
    }
  }

  /**
   * GAPI 스크립트 로드 및 초기화
   */
  async loadGapiScript() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.initGapiClient().then(resolve).catch(reject);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = async () => {
        try {
          await this.initGapiClient();
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => reject(new Error('GAPI script failed to load'));
      document.body.appendChild(script);
    });
  }

  /**
   * GAPI 클라이언트 설정
   */
  async initGapiClient() {
    return new Promise((resolve, reject) => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
          this.gapiInited = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /**
   * GIS 스크립트 로드 및 초기화
   */
  async loadGisScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        this.initGisClient();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.initGisClient();
        resolve();
      };
      script.onerror = () => reject(new Error('GIS script failed to load'));
      document.body.appendChild(script);
    });
  }

  /**
   * GIS 토큰 클라이언트 설정
   */
  initGisClient() {
    // signIn Promise를 해결/거부하기 위한 변수
    let resolvePromise, rejectPromise;

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error !== undefined) {
          console.error('Auth error:', response);
          if (rejectPromise) rejectPromise(response);
          return;
        }
        this.accessToken = response.access_token;
        // GIS는 expires_in (초)를 반환. 만료 시각을 타임스탬프로 저장.
        // 약간의 여유 시간 (60초)을 둠.
        this.tokenExpiresAt = Date.now() + (response.expires_in - 60) * 1000;

        // gapi client에도 토큰 설정 (필수)
        if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken(response);
        }

        this.notifyAuthListeners(true);
        if (resolvePromise) resolvePromise();
      },
    });
    this.gisInited = true;
    // signIn에서 사용할 수 있도록 Promise 핸들러를 노출
    this.setPromiseHandlers = (resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    };
  }

  /**
   * 사용자가 현재 인증 상태인지 확인 (토큰 유효성 검사)
   * @returns {boolean}
   */
  get isAuthenticated() {
    return this.accessToken && Date.now() < this.tokenExpiresAt;
  }

  /**
   * 인증 상태 변경 리스너 등록
   * @param {Function} callback 
   */
  onAuthChange(callback) {
    this.authListeners.push(callback);
    // 현재 상태 즉시 전달
    callback(this.isAuthenticated);
  }

  notifyAuthListeners(status) {
    this.authListeners.forEach(listener => listener(status));
  }

  /**
   * Google 계정 로그인 (토큰 요청)
   * @returns {Promise<void>}
   */
  async signIn() {
    if (!this.gapiInited || !this.gisInited) {
      await this.initClient();
    }

    // GIS 모델에서는 팝업이 뜹니다.
    return new Promise((resolve, reject) => {
      try {
        // initGisClient에 설정된 콜백이 Promise를 처리하도록 핸들러 설정
        this.setPromiseHandlers(resolve, reject);

        // 토큰이 없거나 만료되었다면 사용자 동의(consent) 팝업을 띄움
        if (!this.isAuthenticated) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          // 유효한 토큰이 있으면 추가 팝업 없이 진행
          this.tokenClient.requestAccessToken({ prompt: '' });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Google 계정 로그아웃
   * GIS에서는 명시적인 로그아웃 API가 없으므로 토큰을 폐기합니다.
   * @returns {Promise<void>}
   */
  async signOut() {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Token revoked');
      });
    }

    this.accessToken = null;
    this.tokenExpiresAt = null; // 토큰 만료 시간 초기화
    window.gapi.client.setToken(null);
    this.notifyAuthListeners(false);
  }

  /**
   * 현재 로그인 사용자 정보 가져오기
   * Drive API를 통해 사용자 정보를 가져옵니다.
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser() {
    if (!this.isAuthenticated) return null;

    try {
      const response = await window.gapi.client.drive.about.get({
        fields: 'user'
      });

      const user = response.result.user;
      return {
        name: user.displayName,
        email: user.emailAddress,
        imageUrl: user.photoLink
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * 백업 폴더 찾기 또는 생성
   * @returns {Promise<string>} 폴더 ID
   */
  async findOrCreateFolder() {
    if (!this.isAuthenticated) {
      await this.signIn();
    }

    // 기존 폴더 검색
    const response = await window.gapi.client.drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.result.files && response.result.files.length > 0) {
      this.folderId = response.result.files[0].id;
      return this.folderId;
    }

    // 폴더 생성
    const createResponse = await window.gapi.client.drive.files.create({
      resource: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    this.folderId = createResponse.result.id;
    return this.folderId;
  }

  /**
   * 동기화 파일의 메타데이터(ID, 수정 시간 등)를 가져옵니다.
   * @returns {Promise<Object|null>} 파일 메타데이터 또는 null
   */
  async getSyncFileMetadata() {
    // 가장 최신 백업 파일을 찾아 메타데이터를 반환합니다.
    const files = await this.listBackupFiles();
    if (files.length > 0) {
      return files[0];
    }
    return null;
  }

  /**
   * 새 백업 파일을 Google Drive에 업로드합니다.
   * @param {Blob} blob - 업로드할 파일 Blob
   * @param {Object} appProperties - 파일에 저장할 메타데이터 (버전 정보 등)
   * @param {function(number): void} onProgress - 진행률 콜백 (0-100)
   * @returns {Promise<{file: Object, status: string}>} 업로드 결과 (updated, skipped, created)
   */
  async syncToGoogleDrive(zipBlob, appProperties = {}, onProgress = null) {
    if (!this.isAuthenticated) {
      await this.signIn();
    }

    if (!this.folderId) {
      await this.findOrCreateFolder();
    }

    // fetch API는 업로드 진행률을 제공하지 않으므로 XMLHttpRequest 사용
    return new Promise((resolve, reject) => {
      try {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const fileName = `${BACKUP_FILE_PREFIX}${timestamp}.zip`;

        const metadata = {
          name: fileName,
          mimeType: 'application/zip',
          parents: [this.folderId],
          appProperties,
        };

        const path = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const method = 'POST';

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', zipBlob, fileName);

        const xhr = new XMLHttpRequest();
        xhr.open(method, path);
        xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = (event.loaded / event.total) * 100;
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            const status = 'created'; // 버전 관리 시스템에서는 항상 새 파일을 생성합니다.
            // 업로드 성공 후 오래된 백업 정리
            this.deleteOldBackups().then(() => {
              resolve({ file: result, status });
            });
          } else {
            const errorBody = JSON.parse(xhr.responseText);
            const errorMessage = errorBody.error?.message || xhr.statusText;
            reject(new Error(`Google Drive 업로드 실패: ${errorMessage}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
        };

        xhr.send(form);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 동기화 파일 데이터 가져오기
   * @returns {Promise<ArrayBuffer|null>} 동기화 데이터 ZIP 파일의 ArrayBuffer 또는 null
   */
  async getSyncData() {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    const syncFile = (await this.listBackupFiles())[0]; // 가장 최신 파일

    if (!syncFile) {
      return null;
    }

    // 파일 다운로드
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${syncFile.id}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('파일 다운로드 실패');
    }

    // ZIP 파일을 Blob으로 받아옴 (JSON 파싱하지 않음)
    const blob = await response.blob();
    return { blob };
  }

  /**
   * 백업 파일 목록 조회
   * @returns {Promise<Array>}
   */
  async listBackupFiles() {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }
    if (!this.folderId) {
      await this.findOrCreateFolder();
    }

    const response = await window.gapi.client.drive.files.list({
      q: `name contains '${BACKUP_FILE_PREFIX}' and '${this.folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, size, modifiedTime, appProperties)',
      orderBy: 'createdTime desc', // 최신순으로 정렬
      spaces: 'drive',
    });

    return response.result.files || [];
  }

  /**
   * 백업 파일 다운로드 및 복원
   * @param {string} fileId - 파일 ID
   * @param {Function} onProgress - 진행률 콜백 (percent)
   * @returns {Promise<Object>} 복원할 데이터
   */
  async restoreFromGoogleDrive(fileId, onProgress = null) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (onProgress) onProgress(10);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (onProgress) onProgress(50);

    if (!response.ok) {
      throw new Error('파일 다운로드 실패');
    }

    const blob = await response.blob();

    if (onProgress) onProgress(100);

    return { blob };
  }

  /**
   * 백업 파일 삭제
   * @param {string} fileId - 파일 ID
   * @returns {Promise<void>}
   */
  async deleteBackupFile(fileId) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    await window.gapi.client.drive.files.delete({
      fileId: fileId
    });
  }

  /**
   * 오래된 백업 파일을 자동으로 삭제하여 저장 공간을 관리합니다.
   * @returns {Promise<void>}
   */
  async deleteOldBackups() {
    try {
      const files = await this.listBackupFiles();
      if (files.length > MAX_BACKUPS_TO_KEEP) {
        // 최신순으로 정렬되어 있으므로, 유지할 개수 이후의 파일들이 삭제 대상
        const filesToDelete = files.slice(MAX_BACKUPS_TO_KEEP);

        console.log(`자동 정리: ${filesToDelete.length}개의 오래된 백업을 삭제합니다.`);

        // 각 파일을 순차적으로 삭제
        for (const file of filesToDelete) {
          await this.deleteBackupFile(file.id);
          console.log(`삭제 완료: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('오래된 백업 파일 자동 삭제 실패:', error);
      // 이 에러는 전체 동기화 흐름을 막지 않도록 처리
    }
  }

  /**
   * 파일 크기를 읽기 쉬운 형식으로 변환
   * @param {number} bytes 
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (!bytes) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 날짜를 읽기 쉬운 형식으로 변환
   * @param {string} isoString 
   * @returns {string}
   */
  static formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// 싱글톤 인스턴스 export
export const googleDriveService = new GoogleDriveService();
