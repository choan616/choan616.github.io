/**
 * Google Drive 동기화 서비스
 * Google Identity Services (GIS) 및 Google Drive API v3 사용
 */

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
const FOLDER_NAME = 'DiaryBackup';

class GoogleDriveService {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.gapiInited = false;
    this.gisInited = false;
    this.isAuthenticated = false;

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
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error !== undefined) {
          console.error('Auth error:', response);
          throw response;
        }
        this.accessToken = response.access_token;
        this.isAuthenticated = true;
        this.notifyAuthListeners(true);
      },
    });
    this.gisInited = true;
  }

  /**
   * 인증 상태 변경 리스너 등록
   * @param {Function} callback 
   */
  onAuthChange(callback) {
    this.authListeners.push(callback);
    // 현재 상태 즉시 전달
    if (this.isAuthenticated) {
      callback(true);
    }
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

    // 기존 토큰이 유효한지 확인하는 로직은 생략하고
    // 사용자 액션이 있을 때마다 명시적으로 토큰을 요청합니다.
    // GIS 모델에서는 팝업이 뜹니다.
    return new Promise((resolve, reject) => {
      try {
        // 토큰 클라이언트의 콜백을 일시적으로 래핑하여 Promise 해결
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (resp) => {
          if (resp.error) {
            reject(resp);
          } else {
            this.accessToken = resp.access_token;
            this.isAuthenticated = true;
            this.notifyAuthListeners(true);
            resolve();
          }
          // 원래 콜백 복구 (필요한 경우)
          // this.tokenClient.callback = originalCallback; 
        };

        if (window.gapi.client.getToken() === null) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
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
    this.isAuthenticated = false;
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
   * 데이터를 Google Drive에 백업
   * @param {Object} data - exportAllData()로 생성된 데이터
   * @param {Function} onProgress - 진행률 콜백 (percent)
   * @returns {Promise<Object>} 업로드된 파일 정보
   */
  async backupToGoogleDrive(data, onProgress = null) {
    if (!this.isAuthenticated) {
      await this.signIn();
    }

    if (!this.folderId) {
      await this.findOrCreateFolder();
    }

    // 파일명 생성 (날짜 포함)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `diary_backup_${dateStr}_${timeStr}.json`;

    // JSON 문자열 변환
    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], { type: 'application/json' });

    // 메타데이터
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [this.folderId],
    };

    // FormData 생성
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    // 업로드 (GAPI Multipart Upload)
    if (onProgress) onProgress(10);

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = 'application/json';

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + contentType + '\r\n\r\n' +
      fileContent +
      close_delim;

    try {
      const response = await window.gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
      });

      if (onProgress) onProgress(100);

      return response.result;
    } catch (error) {
      console.error('Backup error:', error);
      throw new Error(`백업 실패: ${error.result?.error?.message || error.message || '알 수 없는 오류'}`);
    }
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
      q: `'${this.folderId}' in parents and trashed=false and mimeType='application/json'`,
      orderBy: 'createdTime desc',
      fields: 'files(id, name, createdTime, size, modifiedTime)',
      spaces: 'drive'
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

    const data = await response.json();

    if (onProgress) onProgress(100);

    return data;
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
