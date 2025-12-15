import React from 'react';
import { useSyncContext } from '../contexts/SyncContext';
import { SyncStatus } from '../constants';

const icons = {
  Cloud: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    </svg>
  ),
  CloudCheck: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  CloudFog: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M5 20h14"/>
    </svg>
  ),
  CloudOff: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.3-8.7M15.5 5.5A4.5 4.5 0 0 0 11 1H9a7 7 0 0 0-1.45.22"/>
    </svg>
  ),
  RefreshCw: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>
    </svg>
  ),
  AlertTriangle: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
  ),
};

/**
 * 동기화 상태를 아이콘과 툴팁으로 표시하는 컴포넌트
 */
export function SyncIndicator() {
  const { status, lastSyncTime, isOnline, lastError } = useSyncContext();
  const getIndicator = () => {
    if (!isOnline) {
      return {
        Icon: icons.CloudOff,
        color: 'text-gray-500',
        title: '오프라인 상태',
        message: '네트워크 연결을 확인해주세요.',
        animation: '',
      };
    }

    switch (status) {
      case SyncStatus.SYNCING:
        return {
          Icon: icons.RefreshCw,
          color: 'text-blue-500',
          title: '동기화 중...',
          message: '데이터를 동기화하고 있습니다.',
          animation: 'animate-spin',
        };
      case SyncStatus.SUCCESS:
        return {
          Icon: icons.CloudCheck,
          color: 'text-green-500',
          title: '동기화 완료',
          message: `마지막 동기화: ${new Date(lastSyncTime).toLocaleTimeString()}`,
          animation: '',
        };
      case SyncStatus.ERROR:
        return {
          Icon: icons.CloudFog,
          color: 'text-red-500',
          title: '동기화 오류',
          message: lastError || '동기화 중 오류가 발생했습니다.',
          animation: '',
        };
      case SyncStatus.CONFLICT:
        return {
          Icon: icons.AlertTriangle,
          color: 'text-yellow-500',
          title: '동기화 충돌 발생',
          message: '데이터 충돌이 감지되었습니다. 수동 동기화를 통해 해결해주세요.',
          animation: 'animate-pulse',
        };
      case SyncStatus.IDLE:
      default:
        return {
          Icon: icons.Cloud,
          color: 'text-gray-400',
          title: '대기 중',
          message: lastSyncTime ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleTimeString()}` : '동기화 대기 중입니다.',
          animation: '',
        };
    }
  };

  const { Icon, color, title, message, animation } = getIndicator();

  return (
    <div className="sync-indicator group relative flex items-center" title={title}>
      <Icon className={`${color} ${animation} h-5 w-5`} />
      <div className="absolute bottom-full mb-2 hidden w-max max-w-xs rounded-md bg-gray-800 px-3 py-2 text-sm text-white shadow-lg group-hover:block">
        <p className="font-semibold">{title}</p>
        <p className="text-xs">{message}</p>
      </div>
    </div>
  );
}