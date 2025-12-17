import React, { useState } from 'react';
import { clearCurrentUser } from '../utils/auth';
import { useSyncContext } from '../contexts/SyncContext';
import { SyncStatus } from '../constants';
import { Icon } from './Icon';
import { useTheme } from '../contexts/useTheme';
import './UserProfileButton.css';
import './Modal.css';

/**
 * 사용자 프로필 버튼 (헤더용)
 * 현재 사용자 표시 및 로그아웃 기능
 */
export function UserProfileButton({ user, onLogout, onSettingsClick, onBackupClick, onStatsClick }) {
  const [showMenu, setShowMenu] = useState(false);
  const { status, lastSyncTime, isOnline } = useSyncContext();
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    clearCurrentUser();
    setShowMenu(false);
    onLogout();
  }

  const initial = (user.name?.[0] || user.email[0]).toUpperCase();
  const displayName = user.name || user.email.split('@')[0];

  const themeItem = {
    key: 'theme',
    icon: theme === 'light' ? 'moon' : 'sun',
    label: theme === 'light' ? '다크 모드' : '라이트 모드',
    action: toggleTheme,
  };

  const menuItems = [
    {
      key: 'backup',
      icon: 'backup',
      label: '백업 및 동기화',
      action: () => onBackupClick && onBackupClick(),
    },
    {
      key: 'stats',
      icon: 'stats',
      label: '통계 보기',
      action: () => onStatsClick && onStatsClick(),
    },
    {
      key: 'settings',
      icon: 'settings',
      label: '설정',
      action: () => onSettingsClick && onSettingsClick(),
    },
    themeItem,
    { key: 'divider1', isDivider: true },
    {
      key: 'logout',
      icon: 'logout',
      label: '로그아웃',
      action: handleLogout,
      className: 'logout',
    },
  ];

  const handleMenuItemClick = (action) => {
    setShowMenu(false);
    action();
  };

  return (
    <div className="user-profile-button">
      <button
        className="profile-toggle"
        onClick={() => setShowMenu(!showMenu)}
        title={`${displayName} (${user.email})`}
      >
        <div className="profile-avatar">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt={displayName} referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </div>
      </button>

      {showMenu && (
        <div className="modal-overlay" onClick={() => setShowMenu(false)}>
          <div className="profile-menu modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-menu-header">
              <div className="profile-avatar-large">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt={displayName} referrerPolicy="no-referrer" />
                ) : (
                  initial
                )}
              </div>
              <div className="profile-menu-user-info">
                <div className="profile-menu-name">{displayName}</div>
                <div className="profile-menu-email">{user.email}</div>
              </div>
            </div>

            <div className="profile-menu-sync-status">
              {renderSyncStatus(status, isOnline, lastSyncTime)}
            </div>

            <nav className="profile-menu-nav">
              <ul>
                {menuItems.map((item) => {
                  if (item.isDivider) {
                    return <li key={item.key} className="profile-menu-divider" />;
                  }
                  return (
                    <li key={item.key}>
                      <button
                        className={`profile-menu-item ${item.className || ''}`}
                        onClick={() => handleMenuItemClick(item.action)}
                      >
                        <Icon name={item.icon} className="menu-item-icon" />
                        <span className="menu-item-label">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function renderSyncStatus(status, isOnline, lastSyncTime) {
  const statusMap = {
    [SyncStatus.SYNCING]: { icon: 'sync', text: '동기화 중...', className: 'syncing' },
    [SyncStatus.SUCCESS]: { icon: 'check-circle', text: '동기화 완료', className: 'success' },
    [SyncStatus.ERROR]: { icon: 'error', text: '오류', className: 'error' },
    [SyncStatus.IDLE]: { icon: 'check-circle', text: '최신 상태', className: 'idle' },
  };

  if (!isOnline) {
    return (
      <div className="sync-status offline" title="오프라인">
        <Icon name="cloud-off" />
        <span className="sync-status-text">오프라인</span>
      </div>
    );
  }

  const { icon, text, className } = statusMap[status] || statusMap[SyncStatus.IDLE];
  const title = status === SyncStatus.SUCCESS && lastSyncTime
    ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleString()}`
    : text;

  return (
    <div className={`sync-status ${className}`} title={title}>
      <Icon name={icon} />
      <span className="sync-status-text">{text}</span>
    </div>
  );
}
