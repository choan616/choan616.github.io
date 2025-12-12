import React, { useState, useEffect, useCallback } from 'react';
import { syncManager } from '../services/syncManager';
import { SyncContext } from './SyncContext';
import { useToast } from '../hooks/useToast';
import { SyncStatus } from '../constants';

/**
 * SyncProvider - 동기화 상태를 앱 전체에 제공
 */
export function SyncProvider({ children }) {
  const [syncState, setSyncState] = useState(syncManager.getState());
  // useToast 훅을 추가하여 토스트 메시지를 사용할 수 있도록 합니다.
  const { showToast } = useToast();

  // SyncManager의 상태 변경을 구독
  useEffect(() => {
    const handleStateChange = (newState) => {
      setSyncState(newState);
      // 자동 동기화 중 오류가 발생했을 때 사용자에게 알림
      if (newState.status === SyncStatus.ERROR && newState.lastError) {
        const errorMessage = newState.lastError.message || '알 수 없는 오류';
        if (errorMessage.includes('central directory')) {
          showToast('자동 동기화 실패: Drive의 백업 파일이 손상되었을 수 있습니다.', 'error');
        }
        // 다른 종류의 자동 동기화 오류는 여기서 처리 가능
      }
    };

    syncManager.addListener(handleStateChange);

    return () => {
      syncManager.removeListener(handleStateChange);
    };
  }, [showToast]); // showToast를 의존성 배열에 추가합니다.

  /**
   * 수동/자동 동기화 트리거
   * @param {Object} options - { silent: boolean }
   */
  const triggerSync = useCallback(async (options = {}) => {
    // syncManager.autoSync는 내부적으로 재시도를 포함하므로,
    // 오류 처리는 이 함수를 호출하는 컴포넌트(App.jsx, BackupPanel.jsx)에서 담당.
    // 여기서는 syncManager의 autoSync를 실행하는 역할만 수행.
    await syncManager.autoSync(options);
  }, []);

  /**
   * 저장 후 지연 동기화 트리거
   */
  const triggerDebouncedSync = useCallback(() => {
    syncManager.debouncedSyncAfterSave();
  }, []);

  const value = {
    status: syncState.status,
    lastSyncTime: syncState.lastSyncTime,
    lastError: syncState.lastError,
    isOnline: syncState.isOnline,
    triggerSync,
    triggerDebouncedSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}