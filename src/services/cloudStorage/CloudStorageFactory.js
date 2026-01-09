/**
 * 클라우드 저장소 팩토리
 * 저장소 타입에 따라 적절한 서비스 인스턴스를 반환합니다.
 */

let googleDriveServiceInstance = null;
let dropboxServiceInstance = null;

export class CloudStorageFactory {
  /**
   * 저장소 서비스 인스턴스 가져오기
   * @param {'google'|'dropbox'} provider - 저장소 제공자
   * @returns {CloudStorageInterface}
   */
  static async getService(provider) {
    switch (provider) {
      case 'google': {
        if (!googleDriveServiceInstance) {
          const { googleDriveService } = await import('./GoogleDriveService');
          googleDriveServiceInstance = googleDriveService;
        }
        return googleDriveServiceInstance;
      }

      case 'dropbox': {
        if (!dropboxServiceInstance) {
          const { dropboxService } = await import('./DropboxService');
          dropboxServiceInstance = dropboxService;
        }
        return dropboxServiceInstance;
      }

      default:
        throw new Error(`Unknown cloud storage provider: ${provider}`);
    }
  }

  /**
   * 사용 가능한 저장소 목록
   * @returns {Array<{value: string, label: string, icon: string}>}
   */
  static getAvailableProviders() {
    return [
      { value: 'google', label: 'Google Drive', icon: '☁️' },
      { value: 'dropbox', label: 'Dropbox', icon: '📦' }
    ];
  }
}
