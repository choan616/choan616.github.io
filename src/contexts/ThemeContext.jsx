import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { uiSettings } from '../services/uiSettings';

const UiSettingsContext = createContext();

export function UiSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => uiSettings.getAll());

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      let effectiveTheme = settings.theme;
      if (settings.theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings.theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const updateSetting = useCallback((key, value) => {
    uiSettings.set(key, value);
    setSettings(uiSettings.getAll());
  }, []);

  const value = useMemo(() => ({ settings, updateSetting }), [settings, updateSetting]);

  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>;
}

export default UiSettingsContext;