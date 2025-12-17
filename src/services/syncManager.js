import { googleDriveService } from './googleDrive';
import { getLatestLocalTimestamp, exportUserDataAsZip, importUserData, getLocalDataSummary, getUser } from '../db/adapter';
import { getSyncMetadata, updateSyncMetadata, getDeviceId } from '../db/syncMetadata';
import { SyncStatus } from '../constants';

import { syncSettings } from './syncSettings'; // syncSettings 모듈 import
class SyncManager {
  constructor() {
    this.userId = null; // 현재 사용자 ID
    this.status = SyncStatus.IDLE;
    this.lastSyncTime = null;
    this.remoteFileId = null; // 원격 파일 ID
    this.deviceId = getDeviceId(); // 이 기기의 고유 ID
    this.lastError = null;
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.syncTimer = null;
    this.debounceTimer = null; // 저장 후 지연 동기화를 위한 타이머
    this.pendingQueue = this.loadQueueFromStorage(); // 오프라인 큐

    // 네트워크 상태 감지
    this.setupNetworkListeners();

    // 설정이 변경되면 타이머를 재시작하도록 이벤트 리스너 설정
    window.addEventListener('settings-updated', this.startAutoSyncTimer.bind(this));
  }

  /**
   * SyncManager 초기화. 비동기 데이터를 로드합니다.
   */
  async init() {
    const metadata = await getSyncMetadata();
    this.lastSyncTime = metadata.lastSyncAt;
    this.remoteFileId = metadata.remoteFileId;
    console.log('SyncManager initialized with metadata:', metadata);

    this.notifyListeners();
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
   * 현재 설정된 사용자 ID를 반환합니다.
   * @returns {string | null}
   */
  getUserId() {
    return this.userId;
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

    const enabled = syncSettings.get('autoSyncEnabled');
    const intervalMinutes = syncSettings.get('syncInterval');
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
    window.addEventListener('online', async () => {
      console.log('네트워크 연결됨');
      this.isOnline = true;
      this.notifyListeners();

      // 1. 대기 중인 큐 먼저 처리
      await this.processPendingQueue();

      // 2. 오프라인에서 온라인으로 복구 시 자동 동기화 (설정 확인)
      if (syncSettings.get('autoSyncEnabled')) {
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
      conflictDetails: this.conflictDetails || null,
    };
  }

  /**
   * 외부(BackupPanel)에서의 동기화(백업/복원) 성공을 알림
   * 상태를 SUCCESS로 변경하고 메타데이터를 업데이트합니다.
   * @param {Object} fileMetadata - 업데이트된 원격 파일 메타데이터
   */
  async notifySyncSuccess(fileMetadata) {
    // fileMetadata는 { file, status } 형태의 객체일 수 있으므로 file 속성을 추출합니다.
    const file = fileMetadata?.file || fileMetadata;
    if (!file || !file.modifiedTime) return;

    try {
      const newSyncTime = new Date(file.modifiedTime).toISOString();
      await updateSyncMetadata({
        lastSyncAt: newSyncTime,
        remoteFileId: file.id,
        lastSyncDeviceId: this.deviceId,
      });
      this.lastSyncTime = newSyncTime;
      this.remoteFileId = file.id;

      this.setStatus(SyncStatus.SUCCESS);
      this.notifyListeners();
      console.log('[SyncManager] External sync success notified. State updated.');
    } catch (error) {
      console.error('[SyncManager] Failed to update metadata after external sync:', error);
    }
  }

  /**
   * 상태 업데이트
   */
  setStatus(status, error = null, extra = {}) {
    this.status = status;
    this.lastError = error;
    this.conflictDetails = extra.conflictDetails || null;

    // 성공 시 lastSyncTime 업데이트는 autoSync 로직 내에서 직접 처리
    if (status !== SyncStatus.SUCCESS) {
      this.notifyListeners();
    }
  }

  /**
   * 오프라인 큐를 localStorage에서 불러오기
   */
  loadQueueFromStorage() {
    try {
      const saved = localStorage.getItem('sync_pending_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('큐 불러오기 실패:', error);
      return [];
    }
  }

  /**
   * 오프라인 큐를 localStorage에 저장
   */
  saveQueueToStorage() {
    try {
      localStorage.setItem('sync_pending_queue', JSON.stringify(this.pendingQueue));
      this.notifyListeners(); // 큐 변경 시 리스너에게 알림
    } catch (error) {
      console.error('큐 저장 실패:', error);
    }
  }

  /**
   * 동기화 요청을 큐에 추가
   */
  addToQueue(syncRequest) {
    this.pendingQueue.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      options: syncRequest
    });
    this.saveQueueToStorage();
    console.log(`동기화 요청을 큐에 추가했습니다. 대기 중: ${this.pendingQueue.length}건`);
  }

  /**
   * 대기 중인 큐 개수 반환
   */
  getPendingCount() {
    return this.pendingQueue.length;
  }

  /**
   * 대기 중인 큐 처리 (온라인 복귀 시)
   */
  async processPendingQueue() {
    if (this.pendingQueue.length === 0) return;

    console.log(`대기 중인 동기화 ${this.pendingQueue.length}건 처리 시작...`);

    // 큐를 복사하고 원본은 비움
    const queue = [...this.pendingQueue];
    this.pendingQueue = [];
    this.saveQueueToStorage();

    // 순차적으로 처리
    for (const request of queue) {
      try {
        await this.autoSync(request.options);
        console.log(`큐 항목 처리 완료: ${request.id}`);
      } catch (error) {
        console.error(`큐 항목 처리 실패: ${request.id}`, error);
        // 실패한 항목은 다시 큐에 추가하지 않음 (무한 루프 방지)
      }
    }

    console.log('대기 중인 큐 처리 완료');
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
   * @returns {Promise<Object|null>} 업로드된 파일의 메타데이터 또는 null
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
        // 1. 로컬 데이터 요약 정보와 ZIP Blob을 동시에 가져오기
        const localSummary = await getLocalDataSummary(this.userId);
        const snapshotBlob = await exportUserDataAsZip(this.userId);
        console.log(`[Push] 전체 데이터 스냅샷 생성 완료 (size: ${snapshotBlob.size} bytes)`);

        // 생성된 ZIP 파일이 너무 작으면 (유효하지 않은 ZIP 파일 가능성) 업로드 중단
        if (snapshotBlob.size < 22) { // 22바이트는 비어있는 ZIP 파일의 최소 크기
          console.log('[Push] 백업할 데이터가 없어 업로드를 건너뜁니다.');
          return { skipped: true };
        }

        // 2. 파일 내용의 해시 계산 (버전 비교용)
        const buffer = await snapshotBlob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 3. Google Drive에 업로드할 때 appProperties에 요약 정보와 해시를 포함
        const appProperties = {
          ...localSummary, // entryCount, imageCount
          contentHash,
        };

        const result = await googleDriveService.syncToGoogleDrive(snapshotBlob, appProperties, () => {}); // Provide an empty progress callback
        console.log('Push 동기화 완료');
        return result; // { file, status } 객체 전체를 반환하도록 수정
      } catch (error) {
        console.error('Push 동기화 실패:', error);
        throw error;
      }
    });
  }

  /**
   * 자동 동기화: Pull → 비교 → Push 순서로 실행
   * @param {Object} options - 옵션
   * @param {boolean} [options.silent=false] - 조용한 동기화 (에러를 throw하지 않음)
   * @param {boolean} [options.isManual=false] - 수동 동기화 여부
   * @param {string} [options.resolution=null] - 충돌 해결 방법 ('push' 또는 'pull')
   * @returns {Promise<void>}
   */
  async autoSync({ silent = false, isManual = false, resolution = null } = {}) {
    // 1. 설정 확인
    const enabled = syncSettings.get('autoSyncEnabled');
    if (!enabled && !isManual && silent) {
      // 수동 호출(silent=false)이 아니고 자동 호출(silent=true)인데 비활성화 상태면 중단
      console.log('자동 동기화가 비활성화되어 있습니다.');
      return;
    }
    // 2. Wi-Fi 전용 모드 확인
    const wifiOnly = syncSettings.get('wifiOnly');
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
      // 수동 동기화인 경우 큐에 추가
      if (isManual) {
        this.addToQueue({ silent, isManual });
      }

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

    // Last-Write-Wins (최신 데이터가 이기는) 전략 기반 동기화
    try {
      // 1. 원격 파일 메타데이터와 로컬 최신 변경 시간 가져오기
      const remoteMetadata = await googleDriveService.getSyncFileMetadata();
      const latestLocalTimestamp = await getLatestLocalTimestamp(this.userId);

      const remoteModifiedTime = remoteMetadata ? new Date(remoteMetadata.modifiedTime).getTime() : 0;
      const localModifiedTime = latestLocalTimestamp ? new Date(latestLocalTimestamp).getTime() : 0;
      const lastSyncTimestamp = this.lastSyncTime ? new Date(this.lastSyncTime).getTime() : 0;

      console.log(`[Sync Check] Remote: ${new Date(remoteModifiedTime).toISOString()}, Local: ${new Date(localModifiedTime).toISOString()}, LastSync: ${new Date(lastSyncTimestamp).toISOString()}`);

      // 2. 동기화 방향 결정
      const isRemoteNewer = remoteModifiedTime > lastSyncTimestamp;
      const isLocalNewer = localModifiedTime > lastSyncTimestamp;

      // 2a. 충돌 해결 모드인 경우, 지정된 방향으로 강제 실행
      if (resolution) {
        console.log(`충돌 해결 모드: '${resolution}' 실행`);
        if (resolution === 'push') {
          await this.performPush();
        } else if (resolution === 'pull') {
          await this.performPull(remoteMetadata);
        }
        // 충돌 해결 후에는 아래의 일반 동기화 로직을 건너뜁니다.
        this.setStatus(SyncStatus.SUCCESS);
        this.notifyListeners();
        return;
      }
      if (isRemoteNewer && isLocalNewer) {
        // --- 충돌 해결 로직 ---
        // 충돌 발생 시, 수동/자동 관계없이 CONFLICT 상태로 설정하고 중단.
        // 사용자가 BackupPanel에서 직접 해결하도록 유도.
        const conflictErrorMsg = '원격과 로컬 데이터가 모두 변경되었습니다. 수동 동기화로 해결해주세요.';
        console.warn('충돌 감지:', conflictErrorMsg);
        // 충돌 상세 정보에 로컬 요약 정보와 사용자 정보를 포함시킵니다.
        const localSummary = await getLocalDataSummary(this.userId);
        const currentUser = await getUser(this.userId);
        this.setStatus(SyncStatus.CONFLICT, conflictErrorMsg, {
          conflictDetails: { remoteMetadata, localModifiedTime, localSummary, currentUser }
        });
        return;
      } else if (isRemoteNewer) {
        // 원격만 변경됨 -> Pull
        console.log('원격에 새로운 변경사항이 있어 Pull을 실행합니다.');
        await this.performPull(remoteMetadata);
      } else if (isLocalNewer) {
        // 로컬만 변경됨 -> Push
        console.log('로컬에 새로운 변경사항이 있어 Push를 실행합니다.');
        await this.performPush();
      } else {
        // 변경 사항 없음
        console.log('원격과 로컬 모두 변경사항이 없습니다. 동기화를 건너뜁니다.');
        // 변경이 없더라도, 동기화를 시도한 현재 시간을 기준으로 마지막 동기화 시간을 갱신합니다.
        // 이렇게 하면 불필요한 재동기화 시도를 방지할 수 있습니다.
        const now = new Date().toISOString();
        await updateSyncMetadata({ lastSyncAt: now });
        this.lastSyncTime = now;
      }

      this.setStatus(SyncStatus.SUCCESS);
      this.notifyListeners(); // 상태 변경 후 리스너에게 알림

    } catch (error) {
      console.error('자동 동기화 실패:', error);
      this.setStatus(SyncStatus.ERROR, error.message);
      if (!silent) {
        throw error;
      }
    }
  }

  /**
   * Pull 동작 수행
   * @param {Object} remoteMetadata - 원격 파일 메타데이터
   */
  async performPull(remoteMetadata) {
    console.log('Pulling remote data...');
    const remoteSyncData = await this.pullSync(); // pullSync는 { blob, id, modifiedTime } 객체를 반환
    if (remoteSyncData && remoteSyncData.blob) {
      console.log('Applying remote data to local DB (merging)...');
      // Blob을 ArrayBuffer로 변환하여 importUserData에 전달
      const zipArrayBuffer = await remoteSyncData.blob.arrayBuffer();

      // importUserData를 사용하여 이미지 포함 전체 데이터를 병합
      await importUserData(this.userId, zipArrayBuffer, true); // true = 병합 모드

      console.log('Remote changelog applied successfully.');

      // 메타데이터 업데이트
      const newSyncTime = new Date(remoteMetadata.modifiedTime).toISOString();
      await updateSyncMetadata({
        lastSyncAt: newSyncTime,
        remoteFileId: remoteMetadata.id,
        lastSyncDeviceId: this.deviceId,
      });
      this.lastSyncTime = newSyncTime;
      this.remoteFileId = remoteMetadata.id;
    }
  }

  /**
   * Push 동작 수행
   */
  async performPush() {
    console.log('Pushing local changes to remote...');
    const uploadedFile = await this.pushSync();
    // uploadedFile은 이제 { file, status, skipped? } 형태의 객체입니다.
    if (uploadedFile && uploadedFile.file && !uploadedFile.skipped) {
      console.log('Local changes pushed successfully.');

      // 메타데이터 업데이트
      const file = uploadedFile.file;
      const newSyncTime = new Date(file.modifiedTime).toISOString();
      await updateSyncMetadata({
        lastSyncAt: newSyncTime,
        remoteFileId: file.id,
        lastSyncDeviceId: this.deviceId,
      });
      this.lastSyncTime = newSyncTime;
      this.remoteFileId = file.id;
    }
  }

  /**
   * 수동 동기화 트리거
   * @returns {Promise<void>}
   */
  async manualSync() {
    return this.autoSync({ silent: false, isManual: true });
  }

  /**
   * 일기 저장 후 지연 동기화 (Debounced Sync)
   * 3초 대기 후 동기화를 실행하며, 연속 저장 시 마지막 저장만 동기화
   * @returns {void}
   */
  debouncedSyncAfterSave() {
    // 설정 확인
    const syncOnSaveEnabled = syncSettings.get('syncOnSave');
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
