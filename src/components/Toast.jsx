import React, { useState, useCallback, useRef, useEffect } from 'react';
import './Toast.css';

import { ToastContext } from '../contexts/ToastContext';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = toastId.current++;
    const newToast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prevToasts =>
      prevToasts.map(t => (t.id === id ? { ...t, isFadingOut: true } : t))
    );

    // 애니메이션 시간(e.g., 300ms) 후 실제 데이터 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    const timers = [];
    toasts.forEach(toast => {
      if (toast.duration > 0 && !toast.isFadingOut) {
        const timer = setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => {
          const toastClasses = [
            'toast',
            `toast-${toast.type}`,
            toast.isFadingOut ? 'fade-out' : ''
          ].join(' ').trim();

          return (
          <div key={toast.id} className={toastClasses}>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
