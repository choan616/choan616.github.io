/**
 * 클라우드 저장소 서비스의 공통 인터페이스
 * 모든 클라우드 저장소 구현체는 이 인터페이스를 준수해야 합니다.
 */
export class CloudStorageInterface {
  /**
   * 클라우드 서비스 클라이언트 초기화
   * @returns {Promise<void>}
   */
  async initClient() {
    throw new Error('initClient() must be implemented');
  }

  /**
   * 사용자 로그인 (OAuth 팝업 등)
   * @returns {Promise<void>}
   */
  async signIn() {
    throw new Error('signIn() must be implemented');
  }

  /**
   * 사용자 로그아웃
   * @returns {Promise<void>}
   */
  async signOut() {
    throw new Error('signOut() must be implemented');
  }

  /**
   * 세션 복원 시도 (Silent Sign-in)
   * @param {string} email - 로그인 힌트로 사용할 이메일
   * @returns {Promise<boolean>} 성공 여부
   */
  async restoreSession(email) {
    throw new Error('restoreSession() must be implemented');
  }

  /**
   * 현재 인증 상태 확인
   * @returns {boolean}
   */
  get isAuthenticated() {
    throw new Error('isAuthenticated getter must be implemented');
  }

  /**
   * 현재 로그인한 사용자 정보 가져오기
   * @returns {Promise<{name: string, email: string, imageUrl?: string}|null>}
   */
  async getCurrentUser() {
    throw new Error('getCurrentUser() must be implemented');
  }

  /**
   * 백업 파일 목록 조회
   * @returns {Promise<Array<{id: string, name: string, createdTime: string, size: number, modifiedTime: string}>>}
   */
  async listBackupFiles() {
    throw new Error('listBackupFiles() must be implemented');
  }

  /**
   * 백업 파일 업로드
   * @param {Blob} zipBlob - 업로드할 ZIP 파일
   * @param {Object} metadata - 파일 메타데이터
   * @param {Function} onProgress - 진행률 콜백 (0-100)
   * @returns {Promise<{file: Object, status: string}>}
   */
  async uploadBackup(zipBlob, metadata, onProgress) {
    throw new Error('uploadBackup() must be implemented');
  }

  /**
   * 백업 파일 다운로드
   * @param {string} fileId - 파일 ID
   * @param {Function} onProgress - 진행률 콜백
   * @returns {Promise<{blob: Blob}>}
   */
  async downloadBackup(fileId, onProgress) {
    throw new Error('downloadBackup() must be implemented');
  }

  /**
   * 동기화용 최신 파일 메타데이터 조회
   * SyncManager에서 사용
   * @returns {Promise<Object|null>}
   */
  async getSyncFileMetadata() {
    throw new Error('getSyncFileMetadata() must be implemented');
  }

  /**
   * 동기화용 최신 파일 데이터 다운로드
   * SyncManager에서 사용
   * @returns {Promise<{blob: Blob, id: string, modifiedTime: string}|null>}
   */
  async getSyncData() {
    throw new Error('getSyncData() must be implemented');
  }

  /**
   * 백업 파일 삭제
   * @param {string} fileId - 파일 ID
   * @returns {Promise<void>}
   */
  async deleteBackup(fileId) {
    throw new Error('deleteBackup() must be implemented');
  }

  /**
   * 인증 상태 변경 리스너 등록
   * @param {Function} callback - 상태 변경 시 호출될 콜백
   * @returns {Function} 구독 취소 함수
   */
  onAuthChange(callback) {
    throw new Error('onAuthChange() must be implemented');
  }

  /**
   * 저장소 제공자 이름
   * @returns {string}
   */
  get providerName() {
    throw new Error('providerName getter must be implemented');
  }
}
