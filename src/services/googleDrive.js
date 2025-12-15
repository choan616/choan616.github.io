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
const FOLDER_NAME = 'Diary2Backup'; // 폴더 이름 변경 (선택 사항)
const SYNC_FILE_NAME = 'sync_data.json'; // ZIP 파일 형식에서 JSON으로 변경

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
   * 단일 동기화 파일 찾기
   * @returns {Promise<Object|null>} 파일 정보 또는 null
   */
  async findSyncFile() {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!this.folderId) {
      await this.findOrCreateFolder();
    }

    const response = await window.gapi.client.drive.files.list({
      q: `name='${SYNC_FILE_NAME}' and '${this.folderId}' in parents and trashed=false`,
      fields: 'files(id, name, createdTime, size, modifiedTime)',
      spaces: 'drive'
    });

    if (response.result.files && response.result.files.length > 0) {
      return response.result.files[0];
    }

    return null;
  }

  /**
   * 동기화 파일의 메타데이터(ID, 수정 시간 등)를 가져옵니다.
   * @returns {Promise<Object|null>} 파일 메타데이터 또는 null
   */
  async getSyncFileMetadata() {
    // findSyncFile 함수가 이미 필요한 메타데이터를 포함하여 반환하므로 재사용합니다.
    return this.findSyncFile();
  }

  /**
   * 단일 파일 동기화 (자동/수동 백업 모두 사용)
   * @param {Blob} zipBlob - JSZip으로 생성된 ZIP 파일 Blob
   * @param {Function} onProgress - 진행률 콜백 (percent)
   * @returns {Promise<{file: Object, status: string}>} 업로드 결과 (updated, skipped, created)
   */
  async syncToGoogleDrive(zipBlob, onProgress = null) {
    if (!this.isAuthenticated) {
      await this.signIn();
    }

    if (!this.folderId) {
      await this.findOrCreateFolder();
    }

    if (onProgress) onProgress(10);

    const existingFile = await this.findSyncFile();
    if (onProgress) onProgress(20);

    const contentType = 'application/json';

    try {
      let metadata, path, method;
      if (existingFile) {
        // 기존 파일 업데이트
        path = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = 'PATCH';
        metadata = { mimeType: contentType }; // 업데이트 시에는 일부 메타데이터만 필요
      } else {
        // 새 파일 생성
        path = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        method = 'POST';
        metadata = {
          name: SYNC_FILE_NAME,
          mimeType: contentType,
          parents: [this.folderId],
        };
      }

      // FormData를 사용하여 멀티파트 요청 생성
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', zipBlob, SYNC_FILE_NAME);

      const response = await fetch(path, {
        method: method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody.error?.message || response.statusText;
        throw new Error(`Google Drive 업로드 실패: ${errorMessage}`);
      }

      const result = await response.json();
      const status = existingFile ? 'updated' : 'created';
      
      if (onProgress) onProgress(100);

      return { file: result, status };

    } catch (error) {
      console.error('Sync error:', error);
      if (error.message.includes('401')) { // fetch 응답에서 401 처리
        this.signOut();
        throw new Error('Google Drive 인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      throw new Error(`동기화 실패: ${error.message || '알 수 없는 오류'}`);
    }
  }

  /**
   * 동기화 파일 데이터 가져오기
   * @returns {Promise<ArrayBuffer|null>} 동기화 데이터 ZIP 파일의 ArrayBuffer 또는 null
   */
  async getSyncData() {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    const syncFile = await this.findSyncFile();

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

    // ZIP 파일을 그대로 ArrayBuffer로 반환
    const fileJson = await response.json();
    return fileJson;
  }

  /**
   * 백업 파일 목록 조회 (단일 동기화 파일)
   * @returns {Promise<Array>}
   */
  async listBackupFiles() {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    const syncFile = await this.findSyncFile();

    return syncFile ? [syncFile] : [];
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

    const fileArrayBuffer = await response.arrayBuffer();

    if (onProgress) onProgress(100);

    return fileArrayBuffer;
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
