import React, { useState } from 'react';
import { useSession } from '../contexts/useSession';
import { getCurrentUser } from '../utils/auth';
import './Modal.css';

export function PasswordSetupModal({ onClose }) {
  const { isNewUser, setIsNewUser, unlock } = useSession();
  const [pin, setPinInput] = useState('');
  const [error, setError] = useState('');

  const currentAuthUserId = getCurrentUser(); // [수정] localStorage에서 직접 가져옵니다.

  // onClose가 있으면 설정에서 호출된 것으로 간주, isNewUser 조건은 무시
  const isInvokedFromSettings = !!onClose;

  // [진단용 로그] 모달 렌더링 조건을 확인합니다.
  console.log('[PasswordSetupModal] 렌더링 조건 확인:', {
    currentAuthUserId,
    isInvokedFromSettings,
    isNewUser,
    'shouldRender': !!(currentAuthUserId && (isInvokedFromSettings || isNewUser))
  });

  // [수정] 렌더링 조건을 단순화합니다.
  // 사용자 ID가 없거나, (설정에서 호출된 것이 아니고 신규 사용자도 아니면) 모달을 표시하지 않습니다.
  // [수정] 사용자 ID가 없으면 모달을 표시하지 않도록 조건을 추가합니다.
  if (!currentAuthUserId || (!isInvokedFromSettings && !isNewUser)) {
    return null;
  }

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0,4);
    setPinInput(v);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError('4자리 숫자 PIN을 입력하세요.');
      return;
    }
    try {
      const { setPin } = await import('../db/adapter');
      await setPin(currentAuthUserId, pin);
      setIsNewUser(false);
      unlock();
      alert('PIN이 설정되었습니다.');
      // 설정에서 호출된 경우 모달을 닫음
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('PIN 설정 실패:', err);
      setError('PIN 설정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button onClick={onClose} className="close-btn" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            ✕
          </button>
        )}
        <h3>보안 PIN 설정</h3>
        <p>서비스 이용을 위해 4자리 PIN을 설정해주세요. (기기 간 동기화)</p>
        <form onSubmit={handleSubmit}>
          <input
            inputMode="numeric"
            pattern="\d{4}"
            value={pin}
            onChange={handleChange}
            placeholder="0000"
            autoFocus
          />
          {error && <div className="error styled-error">{error}</div>}
          <button type="submit">설정</button>
        </form>
      </div>
    </div>
  );
}
