// 상단 바의 동기화 상태 칩. 동기화한 적이 없으면(게스트 등) 아무것도 그리지 않는다
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useSyncContext } from '../contexts/SyncContext';
import { SyncStatus } from '../constants';
import { Icon } from './Icon';

export function SyncIndicator() {
  const { status, lastSyncTime, isOnline, lastError } = useSyncContext();
  // '3분 전' 문구가 멈춰 있지 않게 1분마다 다시 그린다
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  let icon = 'sync';
  let tone = 'ok';
  let label = lastSyncTime
    ? `${formatDistanceToNow(new Date(lastSyncTime), { locale: ko, addSuffix: true })} 동기화`
    : null;
  let title = lastSyncTime ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleString()}` : '';

  if (!isOnline) {
    icon = 'cloud-off';
    tone = 'muted';
    label = '오프라인';
    title = '네트워크 연결을 확인해주세요.';
  } else if (status === SyncStatus.SYNCING) {
    label = '동기화 중';
    title = '데이터를 동기화하고 있습니다.';
  } else if (status === SyncStatus.ERROR || status === SyncStatus.CONFLICT) {
    icon = 'error';
    tone = 'error';
    label = status === SyncStatus.CONFLICT ? '동기화 충돌' : '동기화 오류';
    title = lastError || '동기화 중 오류가 발생했습니다.';
  }

  if (!label) return null;

  return (
    <span className={`sync-pill ${tone}`} title={title}>
      <Icon name={icon} size={14} />
      {label}
    </span>
  );
}
