import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { syncManager } from '../services/syncManager';
import { SyncContext } from './SyncContext';
import { useToast } from '../hooks/useToast';
import { SyncStatus } from '../constants';
// 로컬 데이터 요약 함수를 가져옵니다.
import { ConflictResolutionModal } from '../components/ConflictResolutionModal';

/**
 * SyncProvider - 동기화 상태를 앱 전체에 제공
 */
export function SyncProvider({ children }) {
  // useState에 함수를 전달하면 초기 렌더링 시에만 실행됩니다.
  const [syncState, setSyncState] = useState(() => syncManager.getState());
  // useToast 훅을 추가하여 토스트 메시지를 사용할 수 있도록 합니다.
  const { showToast } = useToast();

  // SyncManager의 상태 변경을 구독
  useEffect(() => {
    const handleStateChange = (newState) => {
      // syncManager의 상태가 변경될 때마다 React 상태를 업데이트합니다.
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

    // 1. 리스너를 등록합니다.
    syncManager.addListener(handleStateChange);

    return () => {
      syncManager.removeListener(handleStateChange);
    };
  }, [showToast]);

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
      } else if (error.code === 'PASSWORD_REQUIRED') {
        showToast('동기화 실패: 암호화된 백업입니다. 설정에서 비밀번호를 입력해주세요.', 'error');
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

  const handleResolveConflict = useCallback(async (resolution) => {
    try {
      // triggerSync에 해결 방법을 전달하여 동기화를 실행합니다.
      // isManual: true로 설정하여 사용자 액션임을 명시합니다.
      await triggerSync({ isManual: true, resolution });
      showToast('✅ 충돌이 해결되었습니다.', 'success');
    } catch (error) {
      console.error('충돌 해결 중 오류 발생:', error);
      // triggerSync에서 이미 에러 토스트를 표시하므로 여기서는 추가로 표시하지 않습니다.
    }
  }, [triggerSync, showToast]);

  const handleCloseConflictModal = useCallback(() => {
    // 모달을 닫을 때 상태를 IDLE로 변경하여 다시 열리지 않도록 합니다.
    syncManager.setStatus(SyncStatus.IDLE);
  }, []);

  // BackupPanel에서 호출할 성공 알림 함수
  const notifySyncSuccess = useCallback(async (result) => {
    await syncManager.notifySyncSuccess(result);
  }, []);

  const contextValue = useMemo(() => ({
    ...syncState,
    triggerSync,
    triggerDebouncedSync,
    notifySyncSuccess
  }), [syncState, triggerSync, triggerDebouncedSync, notifySyncSuccess]);

  // 모달 표시 여부를 상태가 아닌, 렌더링 시점에 파생된 값으로 계산합니다.
  const showConflictModal = syncState.status === SyncStatus.CONFLICT && !!syncState.conflictDetails;

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
      {showConflictModal && syncState.conflictDetails && syncState.conflictDetails.currentUser && (
        <ConflictResolutionModal
          currentUser={syncState.conflictDetails.currentUser}
          remoteMetadata={syncState.conflictDetails.remoteMetadata}
          localModifiedTime={syncState.conflictDetails.localModifiedTime}
          localSummary={syncState.conflictDetails.localSummary}
          onClose={handleCloseConflictModal}
          onResolve={handleResolveConflict}
        />
      )}
    </SyncContext.Provider>
  );
}