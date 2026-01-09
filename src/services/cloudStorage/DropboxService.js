/**
 * Dropbox 클라우드 저장소 서비스
 * OAuth 2.0 PKCE 및 Dropbox API v2 사용
 */
import { CloudStorageInterface } from './CloudStorageInterface';
import { encryptData, decryptData } from '../../utils/crypto';

// 환경 변수에서 Dropbox API 자격증명 로드
const APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY;
const APP_SECRET = import.meta.env.VITE_DROPBOX_APP_SECRET;
const REDIRECT_URI = window.location.origin; // 현재 도메인

// 환경 변수가 설정되지 않은 경우 명확한 에러 메시지 표시
if (!APP_KEY || !APP_SECRET) {
  console.error('Dropbox API credentials are missing!');
  console.error('Please create a .env file with VITE_DROPBOX_APP_KEY and VITE_DROPBOX_APP_SECRET');
}

const BACKUP_FOLDER = ''; // 앱 루트 폴더 사용
const BACKUP_FILE_PREFIX = 'Mmtm_backup_'; // Mmtm에 맞게 수정
const MAX_BACKUPS_TO_KEEP = 20;

class DropboxService extends CloudStorageInterface {
  constructor() {
    super();
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.authListeners = [];

    // PKCE 관련
    this.codeVerifier = null;

    // 암호화 관련 설정
    this.encryptionPassword = null;

    // 토큰을 localStorage에서 복원 시도
    this.restoreTokenFromStorage();
  }

  /**
   * 저장소 제공자 이름
   * @returns {string}
   */
  get providerName() {
    return 'Dropbox';
  }

  /**
   * 암호화 비밀번호 설정
   * @param {string|null} password
   */
  setEncryptionPassword(password) {
    this.encryptionPassword = password;
  }

  /**
   * 현재 인증 상태 확인
   * @returns {boolean}
   */
  get isAuthenticated() {
    return this.accessToken && Date.now() < this.tokenExpiresAt;
  }

  /**
   * localStorage에서 토큰 복원
   */
  restoreTokenFromStorage() {
    try {
      const stored = localStorage.getItem('dropbox_tokens');
      if (stored) {
        const { accessToken, refreshToken, expiresAt } = JSON.parse(stored);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiresAt = expiresAt;

        // 만료되었으면 refresh 시도
        if (this.refreshToken && Date.now() >= this.tokenExpiresAt) {
          this.refreshAccessToken();
        }
      }
    } catch (error) {
      console.error('Failed to restore Dropbox tokens:', error);
    }
  }

  /**
   * 토큰을 localStorage에 저장
   */
  saveTokenToStorage() {
    try {
      localStorage.setItem('dropbox_tokens', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.tokenExpiresAt
      }));
    } catch (error) {
      console.error('Failed to save Dropbox tokens:', error);
    }
  }

  /**
   * 클라이언트 초기화 (Dropbox는 fetch API만 사용하므로 별도 초기화 불필요)
   * @returns {Promise<void>}
   */
  async initClient() {
    return Promise.resolve();
  }

  /**
   * PKCE용 랜덤 문자열 생성
   */
  generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
      .map(v => charset[v % charset.length])
      .join('');
  }

  /**
   * SHA-256 해시 생성
   */
  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return hash;
  }

  /**
   * Base64 URL 인코딩
   */
  base64URLEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * OAuth 2.0 PKCE 로그인
   * @returns {Promise<void>}
   */
  async signIn() {
    this.codeVerifier = this.generateRandomString(128);
    const hashed = await this.sha256(this.codeVerifier);
    const codeChallenge = this.base64URLEncode(hashed);

    const state = this.generateRandomString(32);
    sessionStorage.setItem('dropbox_oauth_state', state);
    sessionStorage.setItem('dropbox_code_verifier', this.codeVerifier);

    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', APP_KEY);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('token_access_type', 'offline');
    authUrl.searchParams.set('scope', 'account_info.read files.content.read files.content.write');

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl.toString(),
      'Dropbox Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise((resolve, reject) => {
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            reject(new Error('Login cancelled'));
            return;
          }

          const popupUrl = popup.location.href;
          if (popupUrl.startsWith(REDIRECT_URI)) {
            const url = new URL(popupUrl);
            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');

            clearInterval(checkPopup);
            popup.close();

            const savedState = sessionStorage.getItem('dropbox_oauth_state');
            if (returnedState !== savedState) {
              reject(new Error('State mismatch - possible CSRF attack'));
              return;
            }

            this.exchangeCodeForToken(code).then(resolve).catch(reject);
          }
        } catch (e) {
          // ignore cross-origin errors
        }
      }, 500);
    });
  }

  /**
   * Authorization code를 access token으로 교환
   */
  async exchangeCodeForToken(code) {
    const codeVerifier = sessionStorage.getItem('dropbox_code_verifier');
    sessionStorage.removeItem('dropbox_oauth_state');
    sessionStorage.removeItem('dropbox_code_verifier');

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: APP_KEY,
        client_secret: APP_SECRET,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    this.saveTokenToStorage();
    this.notifyAuthListeners(true);
  }

  /**
   * Refresh token으로 access token 갱신
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: APP_KEY,
        client_secret: APP_SECRET
      })
    });

    if (!response.ok) {
      this.signOut();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    this.saveTokenToStorage();
    this.notifyAuthListeners(true);
  }

  /**
   * 세션 복원 시도
   */
  async restoreSession(email) {
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        console.log('Silent sign-in failed:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * 로그아웃
   */
  async signOut() {
    if (this.accessToken) {
      try {
        await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      } catch (error) {
        console.error('Token revoke failed:', error);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    localStorage.removeItem('dropbox_tokens');
    this.notifyAuthListeners(false);
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  async getCurrentUser() {
    if (!this.isAuthenticated) return null;

    try {
      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to get user info');

      const data = await response.json();
      return {
        name: data.name.display_name,
        email: data.email,
        imageUrl: data.profile_photo_url || null
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * 백업 파일 목록 조회
   */
  async listBackupFiles() {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: BACKUP_FOLDER,
          recursive: false
        })
      });

      if (!response.ok) {
        if (response.status === 409) return [];
        throw new Error('Failed to list files');
      }

      const data = await response.json();
      return data.entries
        .filter(entry => entry['.tag'] === 'file' && entry.name.startsWith(BACKUP_FILE_PREFIX))
        .map(entry => ({
          id: entry.id,
          name: entry.name,
          createdTime: entry.client_modified,
          modifiedTime: entry.server_modified,
          size: entry.size
        }))
        .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    } catch (error) {
      console.error('Error listing backup files:', error);
      throw error;
    }
  }

  /**
   * 백업 파일 업로드 (암호화 지원)
   */
  async uploadBackup(zipBlob, metadata, onProgress) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    await this.createFolderIfNotExists();

    let uploadBlob = zipBlob;
    let fileExtension = 'zip';

    // 암호화 지원
    if (this.encryptionPassword) {
      try {
        const arrayBuffer = await zipBlob.arrayBuffer();
        const encryptedBuffer = await encryptData(arrayBuffer, this.encryptionPassword);
        uploadBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
        fileExtension = 'enc';
        console.log('Dropbox: 데이터가 암호화되어 업로드됩니다.');
      } catch (err) {
        throw new Error('백업 암호화 중 오류 발생: ' + err.message);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${BACKUP_FILE_PREFIX}${timestamp}.${fileExtension}`;
    const filePath = `${BACKUP_FOLDER}/${fileName}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({
        path: filePath,
        mode: 'add',
        autorename: false,
        mute: false
      }));

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = (event.loaded / event.total) * 100;
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          this.deleteOldBackups().then(() => {
            resolve({
              file: {
                id: result.id,
                name: result.name,
                size: result.size,
                modifiedTime: result.server_modified
              },
              status: 'created'
            });
          });
        } else {
          reject(new Error(`Dropbox 업로드 실패: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
      xhr.send(uploadBlob);
    });
  }

  /**
   * 백업 파일 다운로드 (복호화 지원)
   */
  async downloadBackup(fileId, onProgress) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (onProgress) onProgress(10);
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: fileId })
      }
    });

    if (!response.ok) throw new Error('파일 다운로드 실패');
    let blob = await response.blob();
    if (onProgress) onProgress(80);

    // 복호화 지원 (파일 확장자로 판단)
    if (fileId.endsWith('.enc')) {
      if (!this.encryptionPassword) {
        const error = new Error('암호화된 백업입니다. 설정에서 비밀번호를 입력해주세요.');
        error.code = 'PASSWORD_REQUIRED';
        throw error;
      }
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const decryptedBuffer = await decryptData(arrayBuffer, this.encryptionPassword);
        blob = new Blob([decryptedBuffer], { type: 'application/zip' });
      } catch (err) {
        throw new Error('복호화 실패: 비밀번호가 틀렸거나 파일이 손상되었습니다.');
      }
    }

    if (onProgress) onProgress(100);
    return { blob };
  }

  /**
   * 동기화용 최신 파일 메타데이터 조회
   */
  async getSyncFileMetadata() {
    const files = await this.listBackupFiles();
    return files.length > 0 ? files[0] : null;
  }

  /**
   * 동기화용 최신 파일 데이터 다운로드
   */
  async getSyncData() {
    const syncFile = await this.getSyncFileMetadata();
    if (!syncFile) return null;

    const { blob } = await this.downloadBackup(syncFile.id);
    return { ...syncFile, blob };
  }

  /**
   * 백업 파일 삭제
   */
  async deleteBackup(fileId) {
    if (!this.isAuthenticated) throw new Error('로그인이 필요합니다.');

    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: fileId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`파일 삭제 실패: ${errorData.error_summary}`);
    }
  }

  /**
   * 오래된 백업 파일 자동 삭제
   */
  async deleteOldBackups() {
    try {
      const files = await this.listBackupFiles();
      if (files.length > MAX_BACKUPS_TO_KEEP) {
        const filesToDelete = files.slice(MAX_BACKUPS_TO_KEEP);
        for (const file of filesToDelete) {
          await this.deleteBackup(file.id);
        }
      }
    } catch (error) {
      console.error('Dropbox: 오래된 백업 삭제 실패:', error);
    }
  }

  /**
   * 백업 폴더 생성
   */
  async createFolderIfNotExists() {
    if (!BACKUP_FOLDER) return;
    try {
      await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: BACKUP_FOLDER, autorename: false })
      });
    } catch (e) {
      // conflict is okay
    }
  }

  /**
   * 인증 상태 변경 리스너 등록
   */
  onAuthChange(callback) {
    this.authListeners.push(callback);
    callback(this.isAuthenticated);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== callback);
    };
  }

  notifyAuthListeners(status) {
    this.authListeners.forEach(listener => listener(status));
  }
}

export const dropboxService = new DropboxService();
