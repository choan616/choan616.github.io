/**
 * 인증 유틸리티
 * Web Crypto API를 사용한 비밀번호 해싱 및 검증
 */

/**
 * 랜덤 솔트 생성
 * @returns {string} Hex 인코딩된 솔트
 */
export function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 비밀번호 해싱 (PBKDF2)
 * @param {string} password - 평문 비밀번호
 * @param {string} salt - Hex 인코딩된 솔트
 * @returns {Promise<string>} Hex 인코딩된 해시
 */
export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  // PBKDF2 키 생성
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000, // 보안을 위한 높은 반복 횟수
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 256비트 해시
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 비밀번호 검증
 * @param {string} password - 검증할 비밀번호
 * @param {string} hash - 저장된 해시
 * @param {string} salt - 저장된 솔트
 * @returns {Promise<boolean>} 일치 여부
 */
export async function verifyPassword(password, hash, salt) {
  const newHash = await hashPassword(password, salt);
  return newHash === hash;
}

/**
 * 세션 관리 - 현재 로그인한 사용자 저장
 */
const SESSION_KEY = 'diary_current_user';

export function setCurrentUser(userId) {
  sessionStorage.setItem(SESSION_KEY, userId);
}

export function getCurrentUser() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearCurrentUser() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}
