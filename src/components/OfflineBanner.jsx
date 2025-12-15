import React, { useState, useEffect } from 'react';
import { useSyncContext } from '../contexts/SyncContext';
import { syncManager } from '../services/syncManager';
import { Icon } from './Icon';
import './OfflineBanner.css';

/**
 * 오프라인 상태 배너
 * 네트워크가 끊겼을 때 화면 상단에 표시
 */
export function OfflineBanner() {
  const { isOnline } = useSyncContext();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // 상태가 변경될 때마다 큐 개수 업데이트
    const count = syncManager.getPendingCount();
    setQueueCount(count);
  }, [isOnline]);

  // 온라인 상태면 배너 숨김
  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <Icon name="cloud-off" />
      <span className="offline-text">오프라인 상태입니다</span>
      {queueCount > 0 && (
        <span className="queue-badge">대기 중: {queueCount}건</span>
      )}
    </div>
  );
}
