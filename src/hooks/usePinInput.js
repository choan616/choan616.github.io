import { useState } from 'react';

/**
 * 4자리 숫자 PIN 입력 상태를 관리하는 커스텀 훅
 */
export function usePinInput() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(v);
    setError('');
  };

  return { pin, setPin, error, setError, handleChange };
}
