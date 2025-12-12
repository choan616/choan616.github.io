import React, { useState, useEffect } from 'react';
import { settingsManager } from '../services/settingsManager';
import { useSession } from '../contexts/useSession';
import { getCurrentUser } from '../utils/auth';
import { useToast } from '../hooks/useToast';
import './Settings.css';

export function Settings({ onClose }) {
  const [settings, setSettings] = useState(settingsManager.getAll());
  const { currentUserId: sessionUserId } = useSession();
  const [newPin, setNewPin] = useState('');
  const { showToast } = useToast();

  // currentUserId may be stored in session context or in sessionStorage (auth util)
  const currentUserId = sessionUserId || getCurrentUser();

  // 설정 변경 감지
  useEffect(() => {
    const handleSettingsChange = (newSettings) => {
      setSettings(newSettings);
    };
    settingsManager.addListener(handleSettingsChange);
    return () => settingsManager.removeListener(handleSettingsChange);
  }, []);

  const handleToggle = (key) => {
    settingsManager.set(key, !settings[key]);
  };

  const handleChange = (key, value) => {
    settingsManager.set(key, value);
  };

  const handleResetData = async () => {
    if (!window.confirm('정말로 모든 데이터를 초기화하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 기기에 저장된 모든 일기와 사진이 영구적으로 삭제됩니다!')) {
      return;
    }

    if (!window.confirm('마지막 경고입니다. 정말로 모든 데이터를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { importData } = await import('../db/adapter');
      // 빈 데이터로 덮어쓰기 (초기화)
      await importData({ entries: [], images: [] }, false);
      showToast('모든 데이터가 초기화되었습니다.', 'success');
      window.location.reload();
    } catch (error) {
      console.error('초기화 오류:', error);
      showToast('초기화 실패', 'error');
    }
  };

  const handlePinChange = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      showToast('4자리 숫자 PIN을 입력하세요.', 'warning');
      return;
    }
    if (!currentUserId) {
      showToast('사용자 정보가 없습니다. 다시 로그인해 주세요.', 'error');
      return;
    }
    const { setPin } = await import('../db/adapter');
    try {
      await setPin(currentUserId, newPin);
      showToast('PIN이 성공적으로 변경되었습니다.', 'success');
      setNewPin('');
    } catch (err) {
      console.error('PIN 변경 오류', err);
      showToast('PIN 변경에 실패했습니다.', 'error');
    }
  };

  const handlePinDelete = async () => {
    if (!currentUserId) {
      showToast('사용자 정보가 없습니다. 다시 로그인해 주세요.', 'error');
      return;
    }
    if (!window.confirm('정말로 PIN을 삭제하시겠습니까?')) {
      return;
    }
    const { clearPin } = await import('../db/adapter');
    try {
      await clearPin(currentUserId);
      showToast('PIN이 삭제되었습니다.', 'success');
    } catch (err) {
      console.error('PIN 삭제 오류', err);
      showToast('PIN 삭제에 실패했습니다.', 'error');
    }
  };

  const handlePinInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setNewPin(value);
  };

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ 설정</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          {/* 동기화 설정 */}
          <section className="settings-section">
            <h3>동기화 설정</h3>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">자동 동기화</span>
                <span className="setting-desc">앱을 사용할 때 주기적으로 동기화합니다.</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.autoSyncEnabled}
                  onChange={() => handleToggle('autoSyncEnabled')}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {settings.autoSyncEnabled && (
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">동기화 주기</span>
                  <span className="setting-desc">얼마나 자주 동기화할지 선택하세요.</span>
                </div>
                <select
                  value={settings.syncInterval}
                  onChange={(e) => handleChange('syncInterval', Number(e.target.value))}
                  className="setting-select"
                >
                  <option value={10}>10분마다</option>
                  <option value={30}>30분마다</option>
                  <option value={60}>1시간마다</option>
                  <option value={360}>6시간마다</option>
                </select>
              </div>
            )}

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">Wi-Fi에서만 동기화</span>
                <span className="setting-desc">모바일 데이터 사용을 제한합니다.</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.wifiOnly}
                  onChange={() => handleToggle('wifiOnly')}
                />
                <span className="slider round"></span>
              </label>

              {/* API 미지원 기기 경고 */}
              {!(navigator.connection || navigator.mozConnection || navigator.webkitConnection) && (
                <div className="setting-warning">
                  ⚠️ 이 기기에서는 네트워크 유형을 확인할 수 없어 항상 동기화됩니다.
                </div>
              )}
            </div>
          </section>

          {/* 데이터 관리 */}
          <section className="settings-section">
            <h3>데이터 관리</h3>

            <div className="setting-item danger-zone">
              <div className="setting-info">
                <span className="setting-label text-danger">데이터 초기화</span>
                <span className="setting-desc">기기에 저장된 모든 일기와 사진을 삭제합니다.</span>
              </div>
              <button className="btn btn-danger btn-small" onClick={handleResetData}>
                초기화
              </button>
            </div>
          </section>

          {/* 보안 PIN (변경/삭제) */}
          <section className="settings-section">
            <h3>보안 PIN</h3>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">PIN 변경</span>
                <span className="setting-desc">현재 사용자 계정의 4자리 PIN을 변경하거나 삭제합니다.</span>
              </div>
              <div className="pin-controls flex items-center space-x-2">
                <input
                  value={newPin}
                  onChange={handlePinInputChange}
                  placeholder="0000"
                  inputMode="numeric"
                  maxLength="4"
                />
                <button className="btn btn-primary btn-small" onClick={handlePinChange}>변경</button>
                <button className="btn btn-danger btn-small" onClick={handlePinDelete}>삭제</button>
              </div>
            </div>
          </section>

          {/* 앱 정보 */}
          <section className="settings-section">
            <h3>앱 정보</h3>
            <div className="app-info">
              <p>버전: 1.2.0 (Phase 4)</p>
              <p>개발: Antigravity Agent</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
