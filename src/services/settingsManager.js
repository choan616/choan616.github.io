/**
 * SettingsManager - 사용자 설정 관리 서비스
 * LocalStorage를 사용하여 앱 설정을 영구 저장하고 관리합니다.
 */

export const DEFAULT_SETTINGS = {
  autoSyncEnabled: false,     // 자동 동기화 사용 여부 (기본값: OFF)
  syncInterval: 30,           // 자동 동기화 주기 (분)
  wifiOnly: false,            // Wi-Fi에서만 동기화 (지원 브라우저 한정)
  syncOnSave: true,           // 일기 저장 시 자동 동기화 (NEW)
  fontSize: 'medium',         // 텍스트 크기 (small/medium/large)
  theme: 'light',             // 테마 (light/dark)
};

class SettingsManager {
  constructor() {
    this.settings = this.loadSettings();
    this.listeners = [];
    this.userId = null;
  }

  /**
   * 설정 불러오기 (LocalStorage -> Memory)
   */
  async loadSettingsFromDB(userId) {
    // DB에서 settings 필드 불러오기
    try {
      const { getUser } = await import('../db/adapter');
      const user = await getUser(userId);
      if (user && user.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...user.settings };
        this.userId = userId;
        this.saveSettings();
      }
    } catch (error) {
      console.error('DB에서 설정 불러오기 실패:', error);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('설정 불러오기 실패:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * 설정 저장하기 (Memory -> LocalStorage)
   */
  async saveSettings() {
    try {
      localStorage.setItem('app_settings', JSON.stringify(this.settings));
      if (this.userId) {
        const { db } = await import('../db/db');
        await db.users.update(this.userId, { settings: this.settings });
      }
      this.notifyListeners();
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }
  }

  /**
   * 설정값 가져오기
   * @param {string} key - 설정 키
   */
  get(key) {
    return this.settings[key];
  }

  /**
   * 전체 설정 가져오기
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * 설정값 변경하기
   * @param {string} key - 설정 키
   * @param {any} value - 설정 값
   */
  async set(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
  }

  /**
   * 여러 설정값 한 번에 변경하기
   * @param {Object} newSettings - 변경할 설정 객체
   */
  async update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  /**
   * 설정 초기화
   */
  async reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.saveSettings();
  }

  /**
   * 리스너 등록
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * 리스너 제거
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 변경 알림
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.settings));
  }
}

export const settingsManager = new SettingsManager();
