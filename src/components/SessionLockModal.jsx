import React, { useState, useEffect } from 'react';
import { usePinInput } from '../hooks/usePinInput';
import { useSession } from '../contexts/useSession';
import { googleDriveService } from '../services/googleDrive';
import { getCurrentUser } from '../utils/auth';
import { authenticatePasskey } from '../utils/webauthn';
import { getWebAuthnCredentials } from '../db/adapter';
import { Icon } from './Icon';
import './Modal.css';

export function SessionLockModal() {
  const {
    isNewUser,
    isLocked,
    unlock,
    attemptsLeft,
    decrementAttempt,
    clearSession,
    lastUnlockTime
  } = useSession();

  const currentUserId = getCurrentUser();

  const { pin, setPin, error, setError, handleChange } = usePinInput();

  useEffect(() => {
    if (!isLocked) {
      const id = setTimeout(() => {
        setPin('');
        setError('');
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isLocked, setPin, setError]);

  // PIN이 설정되지 않은 계정은 바로 unlock 처리
  const [pinRequired, setPinRequired] = useState(true);
  const [hasPasskey, setHasPasskey] = useState(false);

  useEffect(() => {
    async function checkSecurity() {
      if (isLocked && currentUserId) {
        // 패스키 존재 여부 확인
        try {
          const credentials = await getWebAuthnCredentials(currentUserId);
          setHasPasskey(credentials.length > 0);
        } catch (e) {
          console.error("Failed to check passkeys", e);
        }

        // 설정 확인
        try {
          const savedSettings = localStorage.getItem('ui_settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.enableScreenLock === false) {
              setPinRequired(false);
              unlock();
              return;
            }
          }
        } catch (e) {
          console.error("Failed to read settings in LockModal", e);
        }

        const { getUser } = await import('../db/adapter');
        const user = await getUser(currentUserId);
        if (!user || !user.pinHash || !user.pinSalt) {
          setPinRequired(false);
          unlock();
        } else {
          setPinRequired(true);
        }
      }
    }
    checkSecurity();
  }, [isLocked, currentUserId, unlock]);

  // [수정] 모든 훅 호출 이후에 렌더링 여부를 결정합니다.
  const savedSettings = JSON.parse(localStorage.getItem('ui_settings') || '{}');
  const lockEnabled = savedSettings.enableScreenLock !== false; // 기본값은 true

  const now = typeof window !== 'undefined' && window.performance ? Math.floor(window.performance.now() + performance.timeOrigin) : Date.now();
  const recentlyUnlocked = lastUnlockTime && now - lastUnlockTime < 600000;

  // 모달을 표시해야 하는 모든 조건을 여기서 확인합니다.
  const shouldDisplayModal = isLocked && pinRequired && lockEnabled && !isNewUser && !recentlyUnlocked;

  if (!shouldDisplayModal) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError('4자리 PIN을 입력하세요.');
      return;
    }
    try {
      const { verifyPin } = await import('../db/adapter');
      const ok = await verifyPin(currentUserId, pin);
      if (ok) {
        unlock();
        setPin('');
      } else {
        decrementAttempt();
        setError(`PIN이 일치하지 않습니다. 남은 시도: ${attemptsLeft - 1}`);
        if (attemptsLeft - 1 <= 0) {
          alert('PIN 입력 실패가 초과되어 다시 로그인해야 합니다.');
          try { await googleDriveService.signOut(); } catch (e) { console.error(e); }
          clearSession();
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('PIN 검증 오류:', err);
      setError('검증 중 오류가 발생했습니다.');
    }
  };

  const handlePasskeyUnlock = async () => {
    setError('');
    try {
      const assertion = await authenticatePasskey();
      const credentials = await getWebAuthnCredentials(currentUserId);
      const isValid = credentials.some(c => c.credentialId === assertion.credentialId);

      if (isValid) {
        unlock();
        setPin('');
      } else {
        setError('등록되지 않은 기기입니다.');
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError('생체 인식에 실패했습니다.');
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>PIN 입력</h3>
        <p>보안을 위해 PIN을 입력해주세요.</p>
        <form onSubmit={handleSubmit}>
          <div className="pin-input-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              inputMode="numeric"
              pattern="\d{4}"
              value={pin}
              onChange={handleChange}
              placeholder="0000"
              autoFocus
              style={{ flex: 1 }}
            />
            {hasPasskey && (
              <button
                type="button"
                className="btn-biometric"
                onClick={handlePasskeyUnlock}
                title="간편 로그인으로 잠금 해제"
                style={{
                  padding: '0 12px',
                  background: 'var(--accent-bg-light)',
                  border: '1px solid var(--accent-color)',
                  borderRadius: '8px',
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '46px',
                  fontSize: '13px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                생체 인증
              </button>
            )}
          </div>
          {error && (
            <div className="error styled-error">
              {error}
            </div>
          )}
          <div className="meta styled-meta">남은 시도: {attemptsLeft}</div>
          <button type="submit">잠금 해제</button>
        </form>
      </div>
    </div>
  );
}
