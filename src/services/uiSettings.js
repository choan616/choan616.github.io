/**
 * uiSettings - UI 관련 설정 관리 (테마, 폰트 크기 등)
 * LocalStorage를 사용합니다.
 */

const UI_SETTINGS_KEY = 'ui_settings';

const DEFAULT_UI_SETTINGS = {
  fontSize: 'medium',
  theme: 'light',
};

class UiSettingsManager {
  constructor() {
    this.settings = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(UI_SETTINGS_KEY);
      return saved ? { ...DEFAULT_UI_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_UI_SETTINGS };
    } catch (error) {
      console.error('UI 설정 불러오기 실패:', error);
      return { ...DEFAULT_UI_SETTINGS };
    }
  }

  save() {
    try {
      localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('UI 설정 저장 실패:', error);
    }
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }
}

export const uiSettings = new UiSettingsManager();