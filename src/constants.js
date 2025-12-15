/**
 * 앱 전역에서 사용되는 상수
 */

export const SyncStatus = {
  IDLE: 'idle',         // 대기
  SYNCING: 'syncing',   // 동기화 중
  SUCCESS: 'success',   // 성공
  ERROR: 'error',       // 오류
  CONFLICT: 'conflict', // 충돌
};

/**
 * 세션 및 인증 관련 상수
 */
export const MAX_ATTEMPTS = 5; // PIN 최대 시도 횟수
export const UNLOCK_DELAY_MS = 30000; // 30초 후 자동 잠금
export const NEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7; // 7일 이내 생성된 계정을 신규로 간주