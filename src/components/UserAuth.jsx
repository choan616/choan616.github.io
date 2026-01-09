import React, { useState } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { CloudStorageFactory } from '../services/cloudStorage/CloudStorageFactory';
import { useSession } from '../contexts/useSession';
import { Icon } from './Icon';
import { authenticatePasskey } from '../utils/webauthn';
import { getUserIdByCredentialId, getUser } from '../db/adapter';
import { Logo } from './Logo';
import './UserAuth.css';


export function UserAuth({ onAuthenticated }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const session = useSession();

  // Google 'G' 로고 아이콘 SVG
  const GoogleIcon = (props) => (
    <svg viewBox="0 0 48 48" {...props}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    </svg>
  );

  // Dropbox 아이콘 SVG
  const DropboxIcon = (props) => (
    <svg viewBox="0 0 48 48" {...props}>
      <path fill="#0061FF" d="M12 2L0 10l12 8 12-8-12-8zm0 16l-12 8 12 8 12-8-12-8zm24-8L24 2l12 8 12-8-12-8zm0 16l-12 8 12 8 12-8-12-8z" />
    </svg>
  );

  // .env 파일에서 허용된 이메일 목록을 가져옵니다.
  const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);

  async function handleCloudLogin(provider = 'google') {
    setIsLoading(true);
    setError('');

    try {
      // 0. 서비스 가져오기
      const cloudService = await CloudStorageFactory.getService(provider);

      // 1. 클라우드 로그인
      await cloudService.signIn();

      // 2. 사용자 정보 가져오기
      const cloudUser = await cloudService.getCurrentUser();
      if (!cloudUser) throw new Error('사용자 정보를 가져올 수 없습니다.');

      // 3. Google Drive의 경우, 허용된 이메일인지 확인합니다.
      // (Dropbox는 개인 백업 용도가 강하므로 일단 제한을 두지 않거나 필요시 추가)
      if (provider === 'google' && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(cloudUser.email)) {
        await cloudService.signOut();
        throw new Error(`접근 권한이 없는 계정입니다: ${cloudUser.email}`);
      }

      // 4. 로컬 DB에 사용자를 생성하거나 프로필 정보를 업데이트합니다.
      const { createUser } = await import('../db/adapter');
      const userId = await createUser(
        { email: cloudUser.email, name: cloudUser.name },
        { imageUrl: cloudUser.imageUrl }
      );

      // 5. 기본 클라우드 제공자로 설정
      localStorage.setItem('preferredCloudProvider', provider);

      let user = await getUser(userId);

      if (!user) { // 만약을 대비한 방어 코드
        const userData = {
          email: cloudUser.email,
          name: cloudUser.name,
          password: ''
        };
        const newUserId = await createUser(userData);
        user = { userId: newUserId, ...userData };
      }

      // 사용자 정보를 세션에 설정
      const { setCurrentUser } = await import('../utils/auth');
      setCurrentUser(user.userId);
      session.setCurrentUser(user.userId);
      session.setIsNewUser(!user.pinHash); // PIN 설정 여부에 따라 신규 사용자 판별

      await onAuthenticated(user, { method: provider });
    } catch (err) {
      console.error(err);
      setError(err.message || `${provider === 'google' ? 'Google' : 'Dropbox'} 로그인 중 오류가 발생했습니다.`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setIsLoading(true);
    setError('');
    try {
      const assertion = await authenticatePasskey();
      const userId = await getUserIdByCredentialId(assertion.credentialId);

      if (!userId) {
        throw new Error('등록된 기기를 찾을 수 없습니다. 먼저 클라우드 계정으로 로그인하여 간편 로그인을 등록해 주세요.');
      }

      const user = await getUser(userId);
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.');

      // 사용자 정보를 세션에 설정
      const { setCurrentUser } = await import('../utils/auth');
      setCurrentUser(user.userId);
      session.setCurrentUser(user.userId);
      session.setIsNewUser(!user.pinHash);

      await onAuthenticated(user, { method: 'passkey' });
    } catch (err) {
      if (err.name !== 'NotAllowedError') { // 사용자가 취소한 경우는 에러 표시 안 함
        setError(err.message || '패스키 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="user-auth-container">
      <div className="login-wrapper">
        <div className="login-header">
          <a href="/" className="login-logo">
            <div className="desktop-auth-logo">
              <Logo size="200" />
            </div>
            <div className="mobile-auth-logo">
              <Logo size="100" />
            </div>
          </a>

        </div>

        <div className="login-card">
          <div className="login-card-body">
            <p className="login-intro-text">
              생체 인식 또는 클라우드 계정으로 로그인하여
              일기를 안전하게 관리하세요.
            </p>
            <div className="login-actions">
              <button className="btn-passkey-login" onClick={handlePasskeyLogin} disabled={isLoading}>
                <span>간편 로그인</span>
              </button>

              <div className="login-divider">
                <span>또는</span>
              </div>

              <div className="cloud-login-buttons">
                <button className="btn-google-login" onClick={() => handleCloudLogin('google')} disabled={isLoading}>
                  {isLoading ? <Icon name="sync" className="login-icon animate-spin" /> : <GoogleIcon className="login-icon" />}
                  <span>Google 계정으로 로그인</span>
                </button>

                <button className="btn-dropbox-login" onClick={() => handleCloudLogin('dropbox')} disabled={isLoading}>
                  {isLoading ? <Icon name="sync" className="login-icon animate-spin" /> : <DropboxIcon className="login-icon" />}
                  <span>Dropbox 계정으로 로그인</span>
                </button>
              </div>
            </div>
            {error && <div className="error styled-error">{error}</div>}
          </div>
        </div>
        <footer className="login-footer">
          <p>© CHOAN</p>
        </footer>
      </div>
    </div>
  );
}
