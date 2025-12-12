import React, { useState } from 'react';
import { useSession } from '../contexts/useSession';
import './Modal.css';

export function PasswordSetupModal() {
  const { currentUserId, isNewUser, setIsNewUser, unlock } = useSession();
  const [pin, setPinInput] = useState('');
  const [error, setError] = useState('');

  if (!isNewUser || !currentUserId) return null;

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
      await setPin(currentUserId, pin);
      setIsNewUser(false);
      unlock();
      alert('PIN이 설정되었습니다. 이 PIN은 기기 간 동기화됩니다.');
    } catch (err) {
      console.error('PIN 설정 실패:', err);
      setError('PIN 설정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
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
          {error && <div className="error">{error}</div>}
          <button type="submit">설정</button>
        </form>
      </div>
    </div>
  );
}
