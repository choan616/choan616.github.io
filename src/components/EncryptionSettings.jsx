import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { googleDriveService } from '../services/cloudStorage/GoogleDriveService';
import Switch from './Switch';

const EncryptionContainer = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
`;

const PasswordInput = styled.input`
  width: 100%;
  padding: 0.8rem;
  margin-top: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
`;

const Button = styled.button`
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function EncryptionSettings({ showToast }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [savedPassword, setSavedPassword] = useState(''); // 현재 적용된 비밀번호

  useEffect(() => {
    // 보안상 비밀번호는 메모리에만 유지합니다. 페이지 새로고침 시 재입력이 필요합니다.
    const inMemoryPwd = googleDriveService.getEncryptionPassword();
    if (inMemoryPwd) {
      setIsEnabled(true);
      setPassword(inMemoryPwd);
      setSavedPassword(inMemoryPwd);
    }
  }, []);

  const handleToggle = (checked) => {
    if (!checked) {
      // 끄기: 비밀번호 삭제
      if (confirm('암호화를 해제하시겠습니까? 이후 백업은 암호화되지 않습니다.')) {
        setIsEnabled(false);
        setPassword('');
        setSavedPassword('');
        googleDriveService.setEncryptionPassword(null);
        showToast('암호화가 해제되었습니다.');
      }
    } else {
      setIsEnabled(true);
    }
  };

  const handleSavePassword = () => {
    if (password.length < 4) {
      showToast('비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    googleDriveService.setEncryptionPassword(password);
    setSavedPassword(password);
    showToast('암호화 비밀번호가 설정되었습니다.');
  };

  return (
    <EncryptionContainer>
      <div className="setting-item">
        <div className="setting-info">
          <label className="setting-label">데이터 암호화 (E2E)</label>
          <span className="setting-desc">
            Google Drive에 백업 시 파일을 암호화합니다. 복원 시 동일한 비밀번호가 필요합니다.
          </span>
        </div>
        <Switch
          checked={isEnabled}
          onChange={() => handleToggle(!isEnabled)}
        />
      </div>

      {isEnabled && (
        <div style={{ marginTop: '1rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            동기화 비밀번호 설정
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <PasswordInput
              type="password"
              placeholder="암호화 및 복원에 사용할 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={handleSavePassword} disabled={!password || password === savedPassword}>
              {savedPassword ? '변경' : '저장'}
            </Button>
          </div>
          {savedPassword && (
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginTop: '0.3rem' }}>
              ✓ 암호화 활성화됨 (페이지 새로고침 시 재입력 필요)
            </p>
          )}
        </div>
      )}
    </EncryptionContainer>
  );
}
