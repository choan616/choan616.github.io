import React, { useState, useEffect } from 'react';
import { useSession } from '../contexts/useSession';
import { googleDriveService } from '../services/googleDrive';
import { getCurrentUser } from '../utils/auth';
import './Modal.css';

export function SessionLockModal() {
  const {
    currentUserId: sessionUserId,
    isLocked,
    unlock,
    attemptsLeft,
    decrementAttempt,
    clearSession,
    lastUnlockTime
  } = useSession();

  const currentUserId = sessionUserId || getCurrentUser();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLocked) {
      const id = setTimeout(() => {
        setInput('');
        setError('');
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isLocked]);

  // 10분 이내면 모달 노출 생략 (Date.now() 안전하게 사용)
  const now = typeof window !== 'undefined' && window.performance ? Math.floor(window.performance.now() + performance.timeOrigin) : Date.now();

  // PIN이 설정되지 않은 계정은 바로 unlock 처리
  const [pinRequired, setPinRequired] = useState(true);
  useEffect(() => {
    async function checkPin() {
      if (isLocked && currentUserId) {
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
    checkPin();
  }, [isLocked, currentUserId, unlock]);

  if (!isLocked || (lastUnlockTime && now - lastUnlockTime < 600000) || !pinRequired) return null;

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0,4);
    setInput(v);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(input)) {
      setError('4자리 PIN을 입력하세요.');
      return;
    }
    try {
      const { verifyPin } = await import('../db/adapter');
      const ok = await verifyPin(currentUserId, input);
      if (ok) {
        unlock();
        setInput('');
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

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>PIN 입력</h3>
        <p>보안을 위해 PIN을 입력해주세요.</p>
        <form onSubmit={handleSubmit}>
          <input
            inputMode="numeric"
            pattern="\d{4}"
            value={input}
            onChange={handleChange}
            placeholder="0000"
            autoFocus
          />
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
