import React, { useState } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { useSession } from '../contexts/useSession';
import { Icon } from './Icon'; // Icon 컴포넌트 사용
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

  // .env 파일에서 허용된 이메일 목록을 가져옵니다.
  const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);

  async function handleGoogleLoginAndCheck() {
    setIsLoading(true);
    setError('');
    try {
      // 1. Google 로그인
      await googleDriveService.signIn();

      // 2. Google 사용자 정보 가져오기
      const googleUser = await googleDriveService.getCurrentUser();
      if (!googleUser) throw new Error('Google 사용자 정보를 가져올 수 없습니다.');

      // 3. 허용된 이메일인지 확인합니다.
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(googleUser.email)) {
        await googleDriveService.signOut();
        throw new Error(`접근 권한이 없는 계정입니다: ${googleUser.email}`);
      }

      // 4. 로컬 DB에서 기존 사용자인지 확인합니다.
      const { getAllUsers, createUser } = await import('../db/adapter');
      const currentUsers = await getAllUsers();
      let user = currentUsers.find(u => u.email === googleUser.email);
      if (!user) {
        // 4-2. 허용된 신규 사용자일 경우, 자동으로 계정을 생성하고 로그인합니다.
        const userData = {
          email: googleUser.email,
          name: googleUser.name,
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

      onAuthenticated(user);
    } catch (err) {
      setError(err.message || 'Google 로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="user-auth-container">
      <div className="login-wrapper">
        <div className="login-header">
          <a href="/" className="login-logo">My Diary</a>
        </div>

        <div className="login-card">
          <div className="login-card-body">
            <p className="login-intro-text">
              Google 계정으로 로그인하여<br />
              모든 기기에서 일기를 안전하게 동기화하세요.
            </p>
            <div className="login-actions">
              <button className="btn-google-login" onClick={handleGoogleLoginAndCheck} disabled={isLoading}>
                {isLoading ? <Icon name="sync" className="login-icon animate-spin" /> : <GoogleIcon className="login-icon" />}
                <span>{isLoading ? '로그인 중...' : 'Google 계정으로 로그인'}</span>
              </button>
            </div>
            {error && <div className="error styled-error">{error}</div>}
          </div>
        </div>
        <footer className="login-footer">
          <p>© My Diary Corp.</p>
        </footer>
      </div>
    </div>
  );
}
