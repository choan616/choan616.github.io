import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_KEY = 'diary-theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. localStorage에서 저장된 테마 확인
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme;

    // 2. 시스템 설정 확인
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // 3. 기본값은 light
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement; // <html> 태그
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeContext;