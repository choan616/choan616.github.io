/**
 * Client-side Encryption Utility using Web Crypto API
 * Algorithm: AES-GCM (256-bit)
 * Key Derivation: PBKDF2 (SHA-256)
 */

// 설정 상수
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 16 bytes
const IV_LENGTH = 12; // 12 bytes
const KEY_LENGTH = 256; // 256 bits

/**
 * 비밀번호에서 암호화 키 파생 (PBKDF2)
 * @param {string} password 
 * @param {Uint8Array} salt 
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * 데이터 암호화
 * @param {ArrayBuffer} data - 암호화할 원본 데이터
 * @param {string} password - 암호화 비밀번호
 * @returns {Promise<ArrayBuffer>} 암호화된 데이터 (Salt + IV + Ciphertext)
 */
export async function encryptData(data, password) {
  // 1. Generate Salt & IV
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 2. Derive Key
  const key = await deriveKey(password, salt);

  // 3. Encrypt
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    data
  );

  // 4. Combine Salt + IV + Ciphertext
  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return result.buffer;
}

/**
 * 데이터 복호화
 * @param {ArrayBuffer} encryptedData - 암호화된 데이터 (Salt + IV + Ciphertext)
 * @param {string} password - 복호화 비밀번호
 * @returns {Promise<ArrayBuffer>} 복호화된 원본 데이터
 * @throws {Error} 비밀번호가 틀리거나 데이터가 손상된 경우
 */
export async function decryptData(encryptedData, password) {
  try {
    const dataArray = new Uint8Array(encryptedData);

    // 1. Extract Salt & IV
    if (dataArray.byteLength < SALT_LENGTH + IV_LENGTH) {
      throw new Error("Invalid data length");
    }

    const salt = dataArray.slice(0, SALT_LENGTH);
    const iv = dataArray.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = dataArray.slice(SALT_LENGTH + IV_LENGTH);

    // 2. Derive Key
    const key = await deriveKey(password, salt);

    // 3. Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("복호화 실패: 비밀번호가 틀리거나 파일이 손상되었습니다.");
  }
}
