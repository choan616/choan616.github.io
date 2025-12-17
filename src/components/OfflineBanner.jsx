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
  // 초기 큐 개수를 가져와서 상태를 초기화합니다.
  const [queueCount, setQueueCount] = useState(() => syncManager.getPendingCount());

  useEffect(() => {
    // syncManager의 상태 변경을 구독합니다.
    const handleStateChange = () => {
      setQueueCount(syncManager.getPendingCount());
    };

    syncManager.addListener(handleStateChange);

    // 컴포넌트가 언마운트될 때 리스너를 정리합니다.
    return () => syncManager.removeListener(handleStateChange);
  }, []); // 이 effect는 컴포넌트 마운트 시 한 번만 실행됩니다.

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
