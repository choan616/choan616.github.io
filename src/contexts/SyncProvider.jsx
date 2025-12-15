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
   * @param {Object} options - { silent: boolean, isManual: boolean }
   */
  const triggerSync = useCallback(async (options = {}) => {
    try {
      await syncManager.autoSync(options);

      // 수동 동기화 성공 시 토스트 표시
      if (options.isManual) {
        showToast('✅ 동기화 완료', 'success');
      }
    } catch (error) {
      console.error('동기화 에러:', error);

      // 에러 메시지 개선 - 사용자가 이해하기 쉽고 실행 가능한 메시지
      const errorMsg = error.message || '';

      if (errorMsg.includes('central directory')) {
        showToast('동기화 실패: 백업 파일이 손상되었을 수 있습니다', 'error');
      } else if (errorMsg.includes('오프라인')) {
        showToast('동기화 실패: 인터넷 연결을 확인해주세요', 'error');
      } else if (errorMsg.includes('Wi-Fi')) {
        showToast('동기화 실패: Wi-Fi 연결이 필요합니다 (설정에서 변경 가능)', 'error');
      } else if (errorMsg.includes('로그인')) {
        showToast('동기화 실패: Google Drive 로그인이 필요합니다', 'error');
      } else {
        showToast(`동기화 실패: ${errorMsg}`, 'error');
      }

      // 에러를 다시 throw하여 호출자가 처리할 수 있도록 함
      throw error;
    }
  }, [showToast]);

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