import React, { useState, useEffect } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { exportAllData, importData } from '../db/adapter';
import { useToast } from './Toast';
import './BackupPanel.css';

export function BackupPanel({ onClose }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [backupFiles, setBackupFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      await googleDriveService.initClient();
      setIsAuthenticated(googleDriveService.isAuthenticated);

      if (googleDriveService.isAuthenticated) {
        setCurrentUser(googleDriveService.getCurrentUser());
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
    }
  }

  async function handleSignIn() {
    try {
      setIsLoading(true);
      await googleDriveService.signIn();
      setIsAuthenticated(true);
      setCurrentUser(googleDriveService.getCurrentUser());
      showToast('Google 로그인 성공', 'success');
      await loadBackupFiles();
    } catch (error) {
      console.error('로그인 오류:', error);
      showToast('로그인 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await googleDriveService.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setBackupFiles([]);
      showToast('로그아웃 되었습니다', 'info');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }

  async function loadBackupFiles() {
    try {
      setIsLoading(true);
      const files = await googleDriveService.listBackupFiles();
      setBackupFiles(files);
    } catch (error) {
      console.error('파일 목록 로드 오류:', error);
      showToast('백업 파일 목록을 불러올 수 없습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBackup() {
    try {
      setIsLoading(true);
      setBackupProgress(0);

      showToast('백업을 시작합니다...', 'info');

      // 데이터 내보내기
      let data;
      try {
        data = await exportAllData();
        console.log('백업 데이터 생성 완료. 크기:', JSON.stringify(data).length);
      } catch (exportError) {
        console.error('데이터 내보내기 오류:', exportError);
        throw new Error(`데이터 생성 실패: ${exportError.message}`);
      }
      setBackupProgress(30);

      // Google Drive에 업로드
      const result = await googleDriveService.backupToGoogleDrive(
        data,
        (percent) => setBackupProgress(30 + percent * 0.7)
      );

      setBackupProgress(100);
      showToast(`백업 완료: ${result.name}`, 'success');

      // 파일 목록 새로고침
      await loadBackupFiles();
    } catch (error) {
      console.error('백업 오류:', error);
      showToast(`백업 실패: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      setBackupProgress(0);
    }
  }

  async function handleRestore(fileId, fileName) {
    if (!confirm(`"${fileName}"을(를) 복원하시겠습니까?\n\n⚠️ 기존 데이터가 덮어쓰여집니다!`)) {
      return;
    }

    try {
      setIsLoading(true);
      setRestoreProgress(0);

      showToast('복원을 시작합니다...', 'info');

      // Google Drive에서 다운로드
      const data = await googleDriveService.restoreFromGoogleDrive(
        fileId,
        (percent) => setRestoreProgress(percent * 0.7)
      );

      // 데이터 가져오기
      await importData(data, false); // false = 덮어쓰기
      setRestoreProgress(100);

      showToast('복원 완료! 페이지를 새로고침합니다.', 'success');

      // 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('복원 오류:', error);
      showToast(`복원 실패: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
      setRestoreProgress(0);
    }
  }

  async function handleDeleteBackup(fileId, fileName) {
    if (!confirm(`"${fileName}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await googleDriveService.deleteBackupFile(fileId);
      showToast('백업 파일이 삭제되었습니다', 'success');
      await loadBackupFiles();
    } catch (error) {
      console.error('삭제 오류:', error);
      showToast('삭제 실패', 'error');
    }
  }

  async function handleExportJSON() {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diary_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('JSON 파일로 내보내기 완료', 'success');
    } catch (error) {
      console.error('내보내기 오류:', error);
      showToast('내보내기 실패', 'error');
    }
  }

  async function handleImportJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('파일을 가져오시겠습니까?\n\n⚠️ 기존 데이터가 덮어쓰여집니다!')) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data, false);
      showToast('가져오기 완료! 페이지를 새로고침합니다.', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('가져오기 오류:', error);
      showToast('가져오기 실패: 파일 형식이 올바르지 않습니다', 'error');
    }
    e.target.value = '';
  }

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="backup-panel-overlay" onClick={handleClose} />
      <div className="backup-panel">
        <div className="backup-header">
          <h2>💾 백업 및 동기화</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="backup-content">
          {/* Google Drive 섹션 */}
          <section className="backup-section">
            <h3>☁️ Google Drive</h3>

            {!isAuthenticated ? (
              <div className="auth-section">
                <p>Google Drive에 로그인하여 일기를 안전하게 백업하세요.</p>
                <button
                  className="btn btn-primary"
                  onClick={handleSignIn}
                  disabled={isLoading}
                >
                  🔐 Google 로그인
                </button>
              </div>
            ) : (
              <div className="authenticated-section">
                <div className="user-info">
                  {currentUser && (
                    <>
                      {currentUser.imageUrl && (
                        <img src={currentUser.imageUrl} alt="프로필" />
                      )}
                      <div>
                        <div className="user-name">{currentUser.name}</div>
                        <div className="user-email">{currentUser.email}</div>
                      </div>
                    </>
                  )}
                  <button className="btn btn-small" onClick={handleSignOut}>
                    로그아웃
                  </button>
                </div>

                <div className="backup-actions">
                  <button
                    className="btn btn-success"
                    onClick={handleBackup}
                    disabled={isLoading}
                  >
                    📤 지금 백업하기
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={loadBackupFiles}
                    disabled={isLoading}
                  >
                    🔄 목록 새로고침
                  </button>
                </div>

                {backupProgress > 0 && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${backupProgress}%` }}
                    />
                    <span className="progress-text">{Math.round(backupProgress)}%</span>
                  </div>
                )}

                {restoreProgress > 0 && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill restore"
                      style={{ width: `${restoreProgress}%` }}
                    />
                    <span className="progress-text">복원 중... {Math.round(restoreProgress)}%</span>
                  </div>
                )}

                {backupFiles.length > 0 && (
                  <div className="backup-files">
                    <h4>백업 파일 목록</h4>
                    <div className="file-list">
                      {backupFiles.map(file => (
                        <div key={file.id} className="file-item">
                          <div className="file-info">
                            <div className="file-name">📄 {file.name}</div>
                            <div className="file-meta">
                              {googleDriveService.constructor.formatDate(file.createdTime)}
                              {' · '}
                              {googleDriveService.constructor.formatFileSize(file.size)}
                            </div>
                          </div>
                          <div className="file-actions">
                            <button
                              className="btn btn-small btn-primary"
                              onClick={() => handleRestore(file.id, file.name)}
                            >
                              복원
                            </button>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleDeleteBackup(file.id, file.name)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 수동 백업 섹션 */}
          <section className="backup-section">
            <h3>💾 수동 백업</h3>
            <p>JSON 파일로 백업하거나 복원할 수 있습니다.</p>
            <div className="manual-backup-actions">
              <button
                className="btn btn-secondary"
                onClick={handleExportJSON}
              >
                📥 JSON 내보내기
              </button>
              <label className="btn btn-secondary">
                📤 JSON 가져오기
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportJSON}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
