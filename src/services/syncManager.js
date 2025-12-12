import { googleDriveService } from './googleDrive';
import { exportUserDataAsZip, importData, hasChangesSince } from '../db/adapter';
import { settingsManager } from './settingsManager';
import { SyncStatus } from '../constants';

class SyncManager {
  constructor() {
    this.userId = null; // 현재 사용자 ID
    this.status = SyncStatus.IDLE;
    this.lastSyncTime = null;
    this.lastError = null;
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.syncTimer = null;
    this.debounceTimer = null; // 저장 후 지연 동기화를 위한 타이머

    // 네트워크 상태 감지
    this.setupNetworkListeners();

    // LocalStorage에서 마지막 동기화 시간 복원
    this.loadLastSyncTime();

    // 설정 변경 감지 및 타이머 설정
    this.setupSettingsListener();
    this.startAutoSyncTimer();
  }

  /**
   * 동기화 매니저에 현재 사용자 ID 설정
   * @param {string | null} userId
   */
  setUserId(userId) {
    this.userId = userId;
    console.log(`SyncManager user ID set to: ${userId || 'null'}`);
  }

  /**
   * 설정 변경 리스너 설정
   */
  setupSettingsListener() {
    settingsManager.addListener(() => {
      // 설정이 변경되면 타이머 재설정
      this.startAutoSyncTimer();
    });
  }

  /**
   * 자동 동기화 타이머 시작
   */
  startAutoSyncTimer() {
    // 기존 타이머 제거
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    const enabled = settingsManager.get('autoSyncEnabled');
    const intervalMinutes = settingsManager.get('syncInterval');

    if (enabled && intervalMinutes > 0) {
      console.log(`자동 동기화 타이머 시작: ${intervalMinutes}분 간격`);
      this.syncTimer = setInterval(() => {
        this.autoSync({ silent: true }).catch(err => console.error('주기적 동기화 실패:', err));
      }, intervalMinutes * 60 * 1000);
    } else {
      console.log('자동 동기화 타이머 중지됨');
    }
  }

  /**
   * 네트워크 상태 이벤트 리스너 설정
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('네트워크 연결됨');
      this.isOnline = true;
      this.notifyListeners();

      // 오프라인에서 온라인으로 복구 시 자동 동기화 (설정 확인)
      if (settingsManager.get('autoSyncEnabled')) {
        this.autoSync({ silent: true }).catch((error) => {
          console.log('온라인 복구 동기화 실패:', error);
        });
      }
    });

    window.addEventListener('offline', () => {
      console.log('네트워크 연결 끊김');
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * 상태 변경 리스너 등록
   * @param {Function} listener - 상태 변경 시 호출될 콜백
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * 리스너 제거
   * @param {Function} listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 모든 리스너에게 상태 변경 알림
   */
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * 현재 상태 가져오기
   */
  getState() {
    return {
      status: this.status,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
      isOnline: this.isOnline,
    };
  }

  /**
   * 상태 업데이트
   */
  setStatus(status, error = null) {
    this.status = status;
    this.lastError = error;

    if (status === SyncStatus.SUCCESS) {
      this.lastSyncTime = new Date().toISOString();
      this.saveLastSyncTime();
    }

    this.notifyListeners();
  }

  /**
   * 마지막 동기화 시간 저장
   */
  saveLastSyncTime() {
    if (this.lastSyncTime) {
      localStorage.setItem('lastSyncTime', this.lastSyncTime);
    }
  }

  /**
   * 마지막 동기화 시간 불러오기
   */
  loadLastSyncTime() {
    const saved = localStorage.getItem('lastSyncTime');
    if (saved) {
      this.lastSyncTime = saved;
    }
  }

  /**
   * 재시도 로직 (Exponential Backoff)
   * @param {Function} fn - 재시도할 비동기 함수
   * @param {number} maxRetries - 최대 재시도 횟수
   * @returns {Promise<any>}
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          // 마지막 시도 실패
          throw error;
        }

        // Exponential backoff: 1초, 2초, 4초
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`재시도 ${i + 1}/${maxRetries}, ${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Wi-Fi 연결 확인 (지원되는 브라우저만)
   * @returns {boolean} Wi-Fi 연결 여부 (알 수 없으면 true 반환)
   */
  isWifiConnected() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) {
      console.log('Network Information API not supported. Assuming Wi-Fi.');
      return true; // API 미지원 시 통과
    }

    console.log('Network Info:', {
      type: connection.type,
      effectiveType: connection.effectiveType,
      saveData: connection.saveData
    });

    // 1. 데이터 절약 모드가 켜져 있으면 Wi-Fi가 아닌 것으로 간주 (또는 사용자가 데이터 사용을 원치 않음)
    if (connection.saveData === true) {
      console.log('Data Saver is enabled. Skipping sync.');
      return false;
    }

    // 2. type이 'wifi'이거나 effectiveType이 '4g'인 경우 (정확하지 않을 수 있음)
    // 보통 type: 'wifi'를 확인하지만, 데스크탑은 'ethernet'일 수 있음.
    // 모바일 데이터 절약이 목적이므로 'cellular'만 아니면 됨.
    if (connection.type === 'cellular') return false;

    return true;
  }

  /**
   * Pull 동기화: Google Drive → 로컬
   * @returns {Promise<Object|null>} 동기화된 데이터 또는 null
   */
  async pullSync() {
    if (!this.isOnline) {
      throw new Error('오프라인 상태입니다');
    }

    if (!googleDriveService.isAuthenticated) {
      throw new Error('Google Drive에 로그인이 필요합니다');
    }

    return this.retryWithBackoff(async () => {
      try {
        // Google Drive에서 동기화 파일 다운로드
        const remoteData = await googleDriveService.getSyncData();

        if (!remoteData) {
          // 원격에 파일이 없으면 Pull 할 것이 없음
          console.log('원격에 동기화 파일이 없습니다');
          return null;
        }

        // The check for ArrayBuffer was removed as getSyncData returns a parsed JSON object.
        // The validation of the content now happens implicitly within getSyncData (HTTP status)
        // and during the data processing step in autoSync.

        console.log('Pull 동기화 완료');
        return remoteData;
      } catch (error) {
        console.error('Pull 동기화 실패:', error);
        throw error;
      }
    });
  }

  /**
   * Push 동기화: 로컬 → Google Drive
   * @returns {Promise<boolean>} 성공 여부
   */
  async pushSync() {
    if (!this.isOnline) {
      throw new Error('오프라인 상태입니다');
    }

    if (!googleDriveService.isAuthenticated) {
      throw new Error('Google Drive에 로그인이 필요합니다');
    }

    if (!this.userId) {
      throw new Error('사용자 ID가 설정되지 않아 Push 동기화를 진행할 수 없습니다.');
    }

    return this.retryWithBackoff(async () => {
      try {
        // 1. 변경 사항 확인 (최적화)
        const hasChanges = await hasChangesSince(this.lastSyncTime);
        if (!hasChanges && this.lastSyncTime) {
          console.log('로컬 변경 사항이 없어 업로드를 건너뜁니다.');
          return { skipped: true };
        }

        // 2. 데이터 내보내기 (사용자 특정)
        const localDataBlob = await exportUserDataAsZip(this.userId);

        // 3. Google Drive 업로드
        await googleDriveService.syncToGoogleDrive(localDataBlob);
        console.log('Push 동기화 완료');
        return true;
      } catch (error) {
        console.error('Push 동기화 실패:', error);
        throw error;
      }
    });
  }

  /**
   * 자동 동기화: Pull → 비교 → Push 순서로 실행
   * @param {Object} options - 옵션
   * @param {boolean} options.silent - 조용한 동기화 (에러를 throw하지 않음)
   * @returns {Promise<void>}
   */
  async autoSync({ silent = false } = {}) {
    // 1. 설정 확인
    const enabled = settingsManager.get('autoSyncEnabled');
    if (!enabled && silent) {
      // 수동 호출(silent=false)이 아니고 자동 호출(silent=true)인데 비활성화 상태면 중단
      console.log('자동 동기화가 비활성화되어 있습니다.');
      return;
    }

    // 2. Wi-Fi 전용 모드 확인
    const wifiOnly = settingsManager.get('wifiOnly');
    if (wifiOnly && !this.isWifiConnected()) {
      if (!silent) {
        throw new Error('Wi-Fi 연결이 필요합니다 (설정됨)');
      }
      console.log('Wi-Fi 연결이 아니어서 동기화를 건너뜁니다.');
      return;
    }

    // 이미 동기화 중이면 중복 실행 방지
    if (this.status === SyncStatus.SYNCING) {
      console.log('이미 동기화가 진행 중입니다');
      return;
    }

    // 오프라인이면 중단
    if (!this.isOnline) {
      if (!silent) {
        throw new Error('오프라인 상태입니다');
      }
      return;
    }

    // 인증되지 않았으면 중단 또는 로그인 시도
    if (!googleDriveService.isAuthenticated) {
      if (silent) {
        console.log('Google Drive 인증 필요 - 자동 동기화 건너뜀');
        return;
      } else {
        // silent가 false이면(예: 로그인 직후) 인증 시도
        try {
          console.log('동기화를 위해 Google Drive 로그인 시도...');
          await googleDriveService.signIn();
        } catch (error) {
          console.error('Google Drive 로그인 실패:', error);
          throw new Error('Google Drive 로그인이 필요합니다.');
        }
      }
    }

    this.setStatus(SyncStatus.SYNCING);

    try {
      // 1. Push: 로컬에 변경사항이 있으면 원격에 먼저 업로드합니다.
      // pushSync 내부에 변경사항이 없을 경우 건너뛰는 로직이 포함되어 있습니다.
      console.log('Step 1: Pushing local changes if any...');
      await this.pushSync();
      console.log('Push step completed.');

      // 2. Pull: 원격 데이터를 가져와서 로컬에 병합합니다.
      console.log('Step 2: Pulling remote data...');
      const remoteData = await this.pullSync();

      if (remoteData) {
        // remoteData는 ArrayBuffer이므로 importUserData에 직접 전달
        // importUserData가 내부에서 ZIP 파싱 및 유효성 검사를 수행
        console.log('원격 데이터를 로컬에 병합 중...');
        const { importUserData } = await import('../db/adapter');
        await importUserData(this.userId, remoteData, true); // true = 병합
        console.log('원격 데이터 병합 완료');
      } else {
        console.log('병합할 새로운 원격 데이터가 없습니다.');
      }

      this.setStatus(SyncStatus.SUCCESS);
    } catch (error) {
      console.error('자동 동기화 실패:', error);
      this.setStatus(SyncStatus.ERROR, error.message);

      if (!silent) {
        throw error;
      }
    }
  }

  /**
   * 수동 동기화 트리거
   * @returns {Promise<void>}
   */
  async manualSync() {
    return this.autoSync({ silent: false });
  }

  /**
   * 일기 저장 후 지연 동기화 (Debounced Sync)
   * 3초 대기 후 동기화를 실행하며, 연속 저장 시 마지막 저장만 동기화
   * @returns {void}
   */
  debouncedSyncAfterSave() {
    // 설정 확인
    const syncOnSaveEnabled = settingsManager.get('syncOnSave');
    if (!syncOnSaveEnabled) {
      console.log('일기 저장 시 자동 동기화가 비활성화되어 있습니다.');
      return;
    }

    // 기존 타이머가 있으면 취소 (debounce)
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 3초 후 동기화 실행
    this.debounceTimer = setTimeout(() => {
      console.log('일기 저장 후 자동 동기화 시작...');
      this.autoSync({ silent: true })
        .then(() => {
          console.log('일기 저장 후 동기화 완료');
        })
        .catch((error) => {
          console.error('일기 저장 후 동기화 실패:', error);
        });
    }, 3000); // 3초 대기
  }
}

// 싱글톤 인스턴스
export const syncManager = new SyncManager();
