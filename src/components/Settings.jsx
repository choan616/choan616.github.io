import React, { useState, useEffect } from 'react';
import { PasswordSetupModal } from './PasswordSetupModal';
import { useUiSettings } from '../contexts/useUiSettings';
import { useToast } from '../hooks/useToast';
import { syncSettings } from '../services/syncSettings';
import { AVAILABLE_FONTS } from '../services/uiSettings';
import { registerPasskey } from '../utils/webauthn';
import { getUser, addWebAuthnCredential } from '../db/adapter';
import { getCurrentUser } from '../utils/auth';
import EncryptionSettings from './EncryptionSettings';
import './Settings.css';

/**
 * 설정 패널 컴포넌트
 */
export function Settings({ isGuest, onClose }) {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const { settings: uiSettings, updateSetting: updateUiSetting } = useUiSettings();
  const [currentSyncSettings, setCurrentSyncSettings] = useState(syncSettings.getAll());

  useEffect(() => {
    const handleSyncSettingsChange = (newSettings) => {
      setCurrentSyncSettings(newSettings);
    };
    syncSettings.addListener(handleSyncSettingsChange);
    return () => syncSettings.removeListener(handleSyncSettingsChange);
  }, []);

  const handleSyncSettingChange = (key, value) => {
    const newSettings = { ...currentSyncSettings, [key]: value };
    setCurrentSyncSettings(newSettings);
    syncSettings.set(key, value);
  };

  const handlePinSetupClick = () => setShowPinSetup(true);

  const { showToast } = useToast();

  const handleRegisterPasskey = async () => {
    try {
      const userId = getCurrentUser();
      if (!userId) return;

      const user = await getUser(userId);
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

      const credential = await registerPasskey({
        userId: user.userId,
        name: user.name,
        email: user.email
      });

      await addWebAuthnCredential(user.userId, credential);
      showToast('패스키가 성공적으로 등록되었습니다.', 'success');
    } catch (err) {
      console.error('Passkey registration failed:', err);
      showToast(err.message || '패스키 등록 중 오류가 발생했습니다.', 'error');
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
            <h3>꾸미기</h3>
            {/* 글꼴 설정 */}
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="fontFamily" className="setting-label">
                  일기 글꼴
                </label>
                <span className="setting-desc">일기 본문의 글꼴을 변경합니다.</span>
              </div>
              <select
                id="fontFamily"
                value={uiSettings.fontFamily}
                onChange={(e) => updateUiSetting('fontFamily', e.target.value)}
                className="setting-select"
              >
                {AVAILABLE_FONTS.map(font => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>동기화</h3>
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
                checked={currentSyncSettings.autoSyncEnabled}
                onChange={() => handleSyncSettingChange('autoSyncEnabled', !currentSyncSettings.autoSyncEnabled)}
              />
            </div>

            {/* 동기화 주기 */}
            {currentSyncSettings.autoSyncEnabled && (
              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="syncInterval" className="setting-label">
                    동기화 주기
                  </label>
                  <span className="setting-desc">자동 동기화가 실행되는 간격입니다.</span>
                </div>
                <select
                  id="syncInterval"
                  value={currentSyncSettings.syncInterval}
                  onChange={(e) => handleSyncSettingChange('syncInterval', Number(e.target.value))}
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
                checked={currentSyncSettings.syncOnSave}
                onChange={() => handleSyncSettingChange('syncOnSave', !currentSyncSettings.syncOnSave)}
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
                checked={currentSyncSettings.wifiOnly}
                onChange={() => handleSyncSettingChange('wifiOnly', !currentSyncSettings.wifiOnly)}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>보안</h3>
            {/* PIN 변경/설정 버튼 - 모든 사용자에게 노출 */}
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">
                  PIN 변경/설정
                </label>
                <span className="setting-desc">앱 잠금에 사용할 4자리 PIN을 설정하거나 변경합니다.</span>
              </div>
              <button className="btn btn-secondary" onClick={handlePinSetupClick}>
                PIN 설정
              </button>
            </div>

            {/* 패스키(WebAuthn) 등록 */}
            {!isGuest && (
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">
                    간편 로그인 등록
                  </label>
                  <span className="setting-desc">현재 기기의 생체 인식(지문/얼굴)을 사용하여 빠르게 로그인하세요.</span>
                </div>
                <button className="btn btn-secondary" onClick={handleRegisterPasskey}>
                  기기 등록
                </button>
              </div>
            )}

            {/* 화면 잠금 사용 설정 - 로그인한 사용자에게만 노출 */}
            {!isGuest && (
              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="enableScreenLock" className="setting-label">
                    화면 잠금 사용
                  </label>
                  <span className="setting-desc">PIN이 설정된 경우, 일정 시간 미사용 시 화면을 잠급니다.</span>
                </div>
                <Switch
                  id="enableScreenLock"
                  checked={uiSettings.enableScreenLock}
                  onChange={() => updateUiSetting('enableScreenLock', !uiSettings.enableScreenLock)}
                />
              </div>
            )}

            {/* 데이터 암호화 설정 - 로그인한 사용자에게만 노출 */}
            {!isGuest && (
              <EncryptionSettings showToast={showToast} />
            )}
          </div>

          <div className="settings-footer">
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* PIN 설정 모달 */}
      {showPinSetup && (
        <PasswordSetupModal
          onClose={() => setShowPinSetup(false)}
        />
      )}
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