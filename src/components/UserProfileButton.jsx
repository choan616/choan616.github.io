import React, { useState } from 'react';
import { useUiSettings } from '../contexts/useUiSettings';
import { useSyncContext } from '../contexts/SyncContext';
import { SyncStatus } from '../constants';
import { Icon } from './Icon';
import './UserProfileButton.css';
import './Modal.css';

/**
 * 사용자 프로필 버튼 (헤더용)
 * 현재 사용자 표시 및 로그아웃 기능
 */
export function UserProfileButton({ user, onLogout, onSettingsClick, onBackupClick, onStatsClick }) {
  const [showMenu, setShowMenu] = useState(false);
  const { status, lastSyncTime, isOnline } = useSyncContext();
  const { settings, updateSetting } = useUiSettings();
  const theme = settings.theme;

  // 로그아웃은 App.jsx에서 처리하므로 여기서는 onLogout만 호출합니다.
  function handleLogout() {
    setShowMenu(false);
    onLogout();
  }

  const initial = (user.name?.[0] || user.email[0]).toUpperCase();
  const displayName = user.name || user.email.split('@')[0];

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
  ];

  // 게스트가 아닐 때만 로그아웃 버튼 추가
  if (!user.isGuest) {
    menuItems.push({ key: 'divider1', isDivider: true });
    menuItems.push({ key: 'logout', icon: 'logout', label: '로그아웃', action: handleLogout, className: 'logout' });
  }

  const handleMenuItemClick = (action) => {
    setShowMenu(false);
    action();
  };

  return (
    <div className="user-profile-button">
      <button
        className="profile-toggle clickable"
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
                        className={`profile-menu-item clickable ${item.className || ''}`}
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

            <div className="theme-control-section">
              <div className="theme-control-header">
                <label className="theme-label">테마</label>
                <span className="theme-current-value">
                  {theme === 'system' ? '🌗 자동' : theme === 'light' ? '☀️ 라이트' : '🌙 다크'}
                </span>
              </div>
              <div className="range-selector-wrapper">
                <div className="range-labels">
                  <span onClick={() => updateSetting('theme', 'system')}>자동</span>
                  <span onClick={() => updateSetting('theme', 'light')}>라이트</span>
                  <span onClick={() => updateSetting('theme', 'dark')}>다크</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={theme === 'system' ? 0 : theme === 'light' ? 1 : 2}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    const newTheme = value === 0 ? 'system' : value === 1 ? 'light' : 'dark';
                    updateSetting('theme', newTheme);
                  }}
                  className="setting-range-slider"
                  title="테마 설정"
                />
              </div>
            </div>
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
