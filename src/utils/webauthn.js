/**
 * WebAuthn (Passkeys) 유틸리티
 * 
 * 브라우저의 WebAuthn API를 사용하여 자격 증명을 생성하고 인증합니다.
 */

/**
 * ArrayBuffer를 Base64URL 문자열로 변환
 */
function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL 문자열을 ArrayBuffer로 변환
 */
function base64URLToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * WebAuthn 등록 (Registration)
 * @param {Object} user - { userId, name, email }
 * @returns {Promise<Object>} 생성된 자격 증명 정보
 */
export async function registerPasskey(user) {
  if (!window.PublicKeyCredential) {
    throw new Error('이 브라우저는 WebAuthn을 지원하지 않습니다.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBuffer = new TextEncoder().encode(user.userId);

  const publicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: "My Diary",
      id: window.location.hostname,
    },
    user: {
      id: userIdBuffer,
      name: user.email,
      displayName: user.name,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: "none"
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  return {
    credentialId: bufferToBase64URL(credential.rawId),
    publicKey: bufferToBase64URL(credential.response.getPublicKey()),
    algorithm: credential.response.getPublicKeyAlgorithm(),
    transports: credential.getTransports ? credential.getTransports() : []
  };
}

/**
 * WebAuthn 인증 (Authentication)
 * @param {Array<string>} allowedCredentialIds - 허용된 자격 증명 ID 목록
 * @returns {Promise<Object>} 인증 결과
 */
export async function authenticatePasskey(allowedCredentialIds = []) {
  if (!window.PublicKeyCredential) {
    throw new Error('이 브라우저는 WebAuthn을 지원하지 않습니다.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKeyCredentialRequestOptions = {
    challenge: challenge,
    rpId: window.location.hostname,
    allowCredentials: allowedCredentialIds.map(id => ({
      id: base64URLToBuffer(id),
      type: 'public-key',
    })),
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  });

  return {
    credentialId: bufferToBase64URL(assertion.rawId),
    clientDataJSON: bufferToBase64URL(assertion.response.clientDataJSON),
    authenticatorData: bufferToBase64URL(assertion.response.authenticatorData),
    signature: bufferToBase64URL(assertion.response.signature),
    userHandle: assertion.response.userHandle ? bufferToBase64URL(assertion.response.userHandle) : null
  };
}

/**
 * 특정 사용자의 자격 증명 ID인지 확인 (로그인 전용)
 * @returns {Promise<Object>}
 */
export async function discoverPasskey() {
  return authenticatePasskey(); // allowCredentials를 비우면 Resident Key 기반으로 찾음
}
