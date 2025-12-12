import React, { useState } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { useSession } from '../contexts/useSession';
import './UserAuth.css';

export function UserAuth({ onAuthenticated }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const session = useSession();

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

  // 구글 로그인만 노출
  return (
    <div className="user-auth-google-only">
      <h2>Google 계정으로 로그인</h2>
      <button className="btn-google-login" onClick={handleGoogleLoginAndCheck} disabled={isLoading}>
        {isLoading ? '로그인 중...' : 'Google 로그인'}
      </button>
      {error && <div className="error styled-error">{error}</div>}
    </div>
  );
}
