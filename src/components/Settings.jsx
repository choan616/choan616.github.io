import React, { useState } from 'react';
import './Settings.css';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS = {
  autoSyncEnabled: false,
  syncInterval: 30,
  wifiOnly: false,
  syncOnSave: true,
  fontSize: 'medium',
  theme: 'light',
};

/**
 * 설정 패널 컴포넌트
 */
export function Settings({ onClose, showToast }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  const handleSelectChange = (key, value) => {
    // 숫자형 값은 숫자로 변환
    const numericValue = Number(value);
    setSettings(prev => ({ ...prev, [key]: numericValue }));
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // 설정이 변경되었음을 다른 컴포넌트(특히 SyncManager)에 알림
      window.dispatchEvent(new CustomEvent('settings-updated'));

      showToast('설정이 저장되었습니다.', 'success');
      onClose();
    } catch (error) {
      console.error('설정 저장 실패:', error);
      showToast('설정 저장에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>설정</h2>
          <button
            onClick={onClose}
            className="close-btn"
            aria-label="닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            {/* 자동 동기화 설정 */}
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="autoSyncEnabled" className="setting-label">
                  자동 동기화
                </label>
                <span className="setting-desc">앱을 사용하지 않을 때도 주기적으로 데이터를 동기화합니다.</span>
              </div>
              <Switch
                id="autoSyncEnabled"
                checked={settings.autoSyncEnabled}
                onChange={() => setSettings(prev => ({ ...prev, autoSyncEnabled: !prev.autoSyncEnabled }))}
              />
            </div>

            {/* 동기화 주기 */}
            {settings.autoSyncEnabled && (
              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="syncInterval" className="setting-label">
                    동기화 주기
                  </label>
                  <span className="setting-desc">자동 동기화가 실행되는 간격입니다.</span>
                </div>
                <select
                  id="syncInterval"
                  value={settings.syncInterval}
                  onChange={(e) => handleSelectChange('syncInterval', e.target.value)}
                  className="setting-select"
                >
                  <option value={5}>5분</option>
                  <option value={15}>15분</option>
                  <option value={30}>30분</option>
                  <option value={60}>1시간</option>
                </select>
              </div>
            )}

            {/* 저장 시 동기화 */}
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="syncOnSave" className="setting-label">
                  저장 시 동기화
                </label>
                <span className="setting-desc">일기를 저장할 때마다 자동으로 동기화를 실행합니다.</span>
              </div>
              <Switch
                id="syncOnSave"
                checked={settings.syncOnSave}
                onChange={() => setSettings(prev => ({ ...prev, syncOnSave: !prev.syncOnSave }))}
              />
            </div>

            {/* Wi-Fi에서만 동기화 */}
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="wifiOnly" className="setting-label">
                  Wi-Fi에서만 동기화
                </label>
                <span className="setting-desc">모바일 데이터 사용을 절약하기 위해 Wi-Fi 연결 시에만 동기화합니다.</span>
              </div>
              <Switch
                id="wifiOnly"
                checked={settings.wifiOnly}
                onChange={() => setSettings(prev => ({ ...prev, wifiOnly: !prev.wifiOnly }))}
              />
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// 재사용 가능한 스위치(토글) 컴포넌트
function Switch({ id, checked, onChange }) {
  return (
    <label htmlFor={id} className="switch">
      <input type="checkbox" id={id} checked={checked} onChange={onChange} />
      <span className="slider round"></span>
    </label>
  );
}