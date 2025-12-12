import React from 'react';
import { useSession } from '../contexts/useSession';

/**
 * SessionWatcher attaches visibility/focus listeners to require unlock on resume.
 * When the browser tab becomes visible again, it triggers the session lock.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export function SessionWatcher({ children }) {
  const session = useSession();

  React.useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        console.log('탭이 복귀됨 - PIN 입력 요구');
        session.requireUnlock(0); // 즉시 요구 (지연 없음)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [session]);

  return children;
}