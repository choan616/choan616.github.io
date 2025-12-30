import { createContext, useContext } from 'react';
import { SyncStatus } from '../constants';

/**
 * SyncContext - 전역 동기화 상태 관리
 */
export const SyncContext = createContext({
  status: SyncStatus.IDLE, // 'idle', 'syncing', 'success', 'error', 'conflict'
  lastSyncTime: null,
  lastError: null,
  isOnline: true,
  triggerSync: async () => { },
  triggerDebouncedSync: () => { },
  notifySyncSuccess: async () => { }, // BackupPanel에서 동기화 성공 알림용
});

/**
 * useSyncContext Hook
 */
export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider');
  }
  return context;
}
