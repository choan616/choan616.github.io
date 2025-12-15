/**
 * syncSettings - 동기화 관련 설정 관리
 * LocalStorage와 DB를 사용합니다.
 */
import { db } from '../db/db';
import { getUser } from '../db/adapter';

const SYNC_SETTINGS_KEY = 'sync_settings';

const DEFAULT_SYNC_SETTINGS = {
  autoSyncEnabled: false,
  syncInterval: 30,
  wifiOnly: false,
  syncOnSave: true,
};

class SyncSettingsManager {
  constructor() {
    this.settings = this.load();
    this.listeners = [];
    this.userId = null;
  }

  async loadFromDB(userId) {
    try {
      const user = await getUser(userId);
      if (user && user.settings) {
        // DB에 저장된 동기화 관련 설정만 가져와 병합
        const dbSyncSettings = (({ autoSyncEnabled, syncInterval, wifiOnly, syncOnSave }) => ({ autoSyncEnabled, syncInterval, wifiOnly, syncOnSave }))(user.settings);
        this.settings = { ...this.settings, ...dbSyncSettings };
        this.userId = userId;
        this.save(); // 로컬스토리지와 동기화
      }
    } catch (error) {
      console.error('DB에서 동기화 설정 불러오기 실패:', error);
    }
  }

  load() {
    try {
      const saved = localStorage.getItem(SYNC_SETTINGS_KEY);
      return saved ? { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SYNC_SETTINGS };
    } catch (error) {
      console.error('동기화 설정 불러오기 실패:', error);
      return { ...DEFAULT_SYNC_SETTINGS };
    }
  }

  async save() {
    try {
      localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(this.settings));
      if (this.userId) {
        // DB에는 전체 설정 객체를 업데이트해야 할 수 있으므로, 기존 설정을 불러와 병합
        const user = await getUser(this.userId);
        const newDbSettings = { ...(user?.settings || {}), ...this.settings };
        await db.users.update(this.userId, { settings: newDbSettings });
      }
      this.notifyListeners();
    } catch (error) {
      console.error('동기화 설정 저장 실패:', error);
    }
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }

  async set(key, value) {
    this.settings[key] = value;
    await this.save();
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.settings));
  }
}

export const syncSettings = new SyncSettingsManager();