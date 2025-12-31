/**
 * Dropbox 클라우드 저장소 서비스
 * OAuth 2.0 PKCE 및 Dropbox API v2 사용
 */
import { CloudStorageInterface } from './CloudStorageInterface';

// 환경 변수에서 Dropbox API 자격증명 로드
const APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY;
const APP_SECRET = import.meta.env.VITE_DROPBOX_APP_SECRET;
const REDIRECT_URI = window.location.origin; // 현재 도메인

// 환경 변수가 설정되지 않은 경우 명확한 에러 메시지 표시
if (!APP_KEY || !APP_SECRET) {
  console.error('Dropbox API credentials are missing!');
  console.error('Please create a .env file with VITE_DROPBOX_APP_KEY and VITE_DROPBOX_APP_SECRET');
  console.error('See .env.example for template');
}

const BACKUP_FOLDER = ''; // 앱 루트 폴더 사용
const BACKUP_FILE_PREFIX = 'diary_backup_';
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
   * 클라이언트 초기화 (Dropbox는 스크립트 로드 불필요)
   * @returns {Promise<void>}
   */
  async initClient() {
    // Dropbox는 fetch API만 사용하므로 별도 초기화 불필요
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
    // 1. code_verifier 생성
    this.codeVerifier = this.generateRandomString(128);

    // 2. code_challenge 생성
    const hashed = await this.sha256(this.codeVerifier);
    const codeChallenge = this.base64URLEncode(hashed);

    // 3. state 생성 (CSRF 방지)
    const state = this.generateRandomString(32);
    sessionStorage.setItem('dropbox_oauth_state', state);
    sessionStorage.setItem('dropbox_code_verifier', this.codeVerifier);

    // 4. 인증 URL 생성
    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', APP_KEY);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('token_access_type', 'offline'); // refresh token 받기
    // 필요한 권한 명시 (App Console에서 먼저 활성화해야 함)
    authUrl.searchParams.set('scope', 'account_info.read files.content.read files.content.write');

    // 5. 팝업으로 인증 페이지 열기
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl.toString(),
      'Dropbox Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // 6. 팝업에서 리다이렉트 감지
    return new Promise((resolve, reject) => {
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            reject(new Error('Login cancelled'));
            return;
          }

          // 팝업 URL 확인 (same-origin이어야 접근 가능)
          const popupUrl = popup.location.href;
          if (popupUrl.startsWith(REDIRECT_URI)) {
            const url = new URL(popupUrl);
            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');

            clearInterval(checkPopup);
            popup.close();

            // state 검증
            const savedState = sessionStorage.getItem('dropbox_oauth_state');
            if (returnedState !== savedState) {
              reject(new Error('State mismatch - possible CSRF attack'));
              return;
            }

            // code로 토큰 교환
            this.exchangeCodeForToken(code).then(resolve).catch(reject);
          }
        } catch (e) {
          // Cross-origin 에러는 무시 (아직 리다이렉트 안됨)
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
      // Refresh 실패 시 재로그인 필요
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
   * 세션 복원 시도 (Silent Sign-in)
   * @param {string} email - 사용하지 않음 (Dropbox는 refresh token 사용)
   * @returns {Promise<boolean>}
   */
  async restoreSession(email) {
    console.log('Attempting to restore Dropbox session');

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
   * @returns {Promise<void>}
   */
  async signOut() {
    // Dropbox는 토큰 revoke API 제공
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
   * @returns {Promise<{name: string, email: string}|null>}
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
   * @returns {Promise<Array>}
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
        // 폴더가 없으면 빈 배열 반환
        if (response.status === 409) {
          return [];
        }
        throw new Error('Failed to list files');
      }

      const data = await response.json();

      // Dropbox 형식을 Google Drive와 유사하게 변환
      const files = data.entries
        .filter(entry => entry['.tag'] === 'file' && entry.name.startsWith(BACKUP_FILE_PREFIX))
        .map(entry => ({
          id: entry.id,
          name: entry.name,
          createdTime: entry.client_modified,
          modifiedTime: entry.server_modified,
          size: entry.size
        }))
        .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

      return files;
    } catch (error) {
      console.error('Error listing backup files:', error);
      throw error;
    }
  }

  /**
   * 백업 파일 업로드
   * @param {Blob} zipBlob - 업로드할 ZIP 파일
   * @param {Object} metadata - 메타데이터 (사용하지 않음)
   * @param {Function} onProgress - 진행률 콜백
   * @returns {Promise<{file: Object, status: string}>}
   */
  async uploadBackup(zipBlob, metadata, onProgress) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    // 폴더 생성 (없으면)
    await this.createFolderIfNotExists();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${BACKUP_FILE_PREFIX}${timestamp}.zip`;
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
          let result;
          try {
            result = JSON.parse(xhr.responseText);
          } catch (e) {
            console.warn('Dropbox 업로드 응답이 JSON 형식이 아닙니다:', xhr.responseText);
            // JSON이 아니더라도 200 OK이면 성공으로 간주
            result = {
              id: fileName, // 임시 ID
              name: fileName,
              size: zipBlob.size
            };
          }

          // 오래된 백업 정리
          this.deleteOldBackups().then(() => {
            resolve({
              file: {
                id: result.id || fileName,
                name: result.name || fileName,
                size: result.size || zipBlob.size
              },
              status: 'created'
            });
          });
        } else {
          let errorMsg = xhr.statusText;
          try {
            const error = JSON.parse(xhr.responseText);
            errorMsg = error.error_summary || error.error || error.error_description || xhr.responseText;
          } catch (e) {
            errorMsg = xhr.responseText || xhr.statusText;
          }
          reject(new Error(`Dropbox 업로드 실패 (${xhr.status}): ${errorMsg}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('네트워크 오류로 업로드에 실패했습니다.'));
      };

      xhr.send(zipBlob);
    });
  }

  /**
   * 백업 파일 다운로드
   * @param {string} fileId - 파일 ID (또는 Path)
   * @param {Function} onProgress - 진행률 콜백
   * @returns {Promise<{blob: Blob}>}
   */
  async downloadBackup(fileId, onProgress) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    if (onProgress) onProgress(10);

    // Dropbox API는 path 인자에 파일 경로나 id:xxxx 형식을 모두 허용합니다.
    const filePath = fileId;

    if (onProgress) onProgress(30);

    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: filePath })
      }
    });

    if (onProgress) onProgress(60);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`파일 다운로드 실패: ${errorText}`);
    }

    const blob = await response.blob();

    if (onProgress) onProgress(100);

    return { blob };
  }

  /**
   * 백업 파일 삭제
   * @param {string} fileId - 파일 ID (또는 Path)
   * @returns {Promise<void>}
   */
  async deleteBackup(fileId) {
    if (!this.isAuthenticated) {
      throw new Error('로그인이 필요합니다.');
    }

    // Dropbox API는 path 인자에 파일 경로나 id:xxxx 형식을 모두 허용합니다.
    const filePath = fileId;

    console.log(`Dropbox 파일 삭제 요청: ${filePath}`);

    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: filePath })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`파일 삭제 실패: ${errorData.error_summary || response.statusText}`);
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

        console.log(`자동 정리: ${filesToDelete.length}개의 오래된 백업을 삭제합니다.`);

        for (const file of filesToDelete) {
          await this.deleteBackup(file.id);
          console.log(`삭제 완료: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('오래된 백업 파일 자동 삭제 실패:', error);
    }
  }

  /**
   * 백업 폴더 생성 (없으면)
   */
  async createFolderIfNotExists() {
    if (!BACKUP_FOLDER) return; // 루트 폴더면 생성 불필요

    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: BACKUP_FOLDER,
          autorename: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 폴더가 이미 존재하는 경우(path/conflict)는 에러가 아님
        if (errorData.error && errorData.error['.tag'] === 'path' && errorData.error.path['.tag'] === 'conflict') {
          return;
        }
        console.error('폴더 생성 실패:', errorData);
        // 권한 문제인 경우 throw
        throw new Error(`폴더 생성 실패: ${errorData.error_summary || response.statusText}`);
      }
    } catch (error) {
      if (error.message && error.message.includes('conflict')) return; // 한 번 더 방어
      console.warn('백업 폴더 생성 중 오류 (이미 존재할 수 있음):', error);
    }
  }

  /**
   * 인증 상태 변경 리스너 등록
   * @param {Function} callback
   * @returns {Function} 구독 취소 함수
   */
  onAuthChange(callback) {
    this.authListeners.push(callback);
    callback(this.isAuthenticated);

    return () => {
      this.authListeners = this.authListeners.filter(
        listener => listener !== callback
      );
    };
  }

  notifyAuthListeners(status) {
    this.authListeners.forEach(listener => listener(status));
  }
}

// 싱글톤 인스턴스 export
export const dropboxService = new DropboxService();
