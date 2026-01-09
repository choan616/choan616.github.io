import React, { useState, useCallback } from 'react';
import { NEW_THRESHOLD_MS, UNLOCK_DELAY_MS, MAX_ATTEMPTS } from '../constants';
import { SessionContext } from './sessionContextObject';

export function SessionProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLocked, setIsLocked] = useState(() => {
    // 초기 로딩 시 잠금 상태 결정 (새로고침 시 보안 강화)
    if (typeof window === 'undefined') return false;

    const savedSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    const lockEnabled = savedSettings.enableScreenLock !== false; // 기본값 true
    const hasUser = !!sessionStorage.getItem('diary_current_user');

    return hasUser && lockEnabled;
  });
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [isNewUser, setIsNewUser] = useState(false);
  const [unlockTimer, setUnlockTimer] = useState(null);
  const [lastUnlockTime, setLastUnlockTime] = useState(null); // 마지막 unlock 시각

  const setCurrentUser = useCallback((userId) => {
    setCurrentUserId(userId);
    setIsLocked(false);
    setAttemptsLeft(MAX_ATTEMPTS);
  }, []);

  const requireUnlock = useCallback((delay = UNLOCK_DELAY_MS) => {
    // 10분(600,000ms) 이내면 잠금 생략
    if (lastUnlockTime && Date.now() - lastUnlockTime < 600000) {
      setIsLocked(false);
      return;
    }
    if (unlockTimer) {
      clearTimeout(unlockTimer);
    }
    const t = setTimeout(() => {
      setIsLocked(true);
    }, delay);
    setUnlockTimer(t);
  }, [unlockTimer, lastUnlockTime]);

  const unlock = useCallback(() => {
    if (unlockTimer) {
      clearTimeout(unlockTimer);
      setUnlockTimer(null);
    }
    setIsLocked(false);
    setAttemptsLeft(MAX_ATTEMPTS);
    setLastUnlockTime(Date.now()); // unlock 시각 기록
  }, [unlockTimer]);

  const decrementAttempt = useCallback(() => {
    setAttemptsLeft(prev => {
      const next = prev - 1;
      if (next <= 0) {
        setIsLocked(true);
      }
      return next;
    });
  }, []);

  const resetAttempts = useCallback(() => {
    setAttemptsLeft(MAX_ATTEMPTS);
  }, []);

  const clearSession = useCallback(() => {
    setCurrentUserId(null);
    setIsLocked(false);
    setAttemptsLeft(MAX_ATTEMPTS);
    setIsNewUser(false);
    if (unlockTimer) {
      clearTimeout(unlockTimer);
      setUnlockTimer(null);
    }
  }, [unlockTimer]);

  const value = {
    currentUserId,
    setCurrentUser,
    isLocked,
    requireUnlock,
    unlock,
    attemptsLeft,
    decrementAttempt,
    resetAttempts,
    clearSession,
    isNewUser,
    lastUnlockTime,
    setIsNewUser,
    NEW_THRESHOLD_MS,
    UNLOCK_DELAY_MS,
    MAX_ATTEMPTS
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
