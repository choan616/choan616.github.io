import React, { useState } from 'react';
import { googleDriveService } from '../services/googleDrive';
import { syncManager } from '../services/syncManager';
import { useSyncContext } from '../contexts/SyncContext';
import { useToast } from '../hooks/useToast';
import './BackupPanel.css';
import './ConflictResolutionModal.css';
import { SyncStatus } from '../constants';

export function BackupPanel({ currentUser, onClose, onDataRestored }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [backupFiles, setBackupFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const { showToast } = useToast();
  const { status, lastSyncTime, lastError, triggerSync } = useSyncContext();

  async function handleSignIn() {
    try {
      setIsLoading(true);
      await googleDriveService.signIn();
      setIsAuthenticated(true);
      setGoogleUser(googleDriveService.getCurrentUser());
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
      setGoogleUser(null);
      setBackupFiles([]);
      showToast('로그아웃 되었습니다', 'info');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }

  async function loadBackupFiles() {
    try {
      setIsLoading(true);
      let files = await googleDriveService.listBackupFiles();
      // 파일을 최신순으로 정렬
      files.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
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

      // 1. 데이터를 ZIP 파일로 압축
      let zipBlob;
      const { exportUserDataAsZip } = await import('../db/adapter');
      try {
        zipBlob = await exportUserDataAsZip(currentUser.userId);
        console.log('백업 ZIP 파일 생성 완료. 크기:', zipBlob.size);

        // 생성된 ZIP 파일이 너무 작으면 (유효하지 않은 ZIP 파일 가능성) 업로드 중단
        if (zipBlob.size < 22) { // 22바이트는 비어있는 ZIP 파일의 최소 크기
          showToast('백업할 데이터가 없습니다.', 'info');
          setIsLoading(false);
          return;
        }
      } catch (exportError) {
        console.error('데이터 내보내기 오류:', exportError);
        throw new Error(`데이터 생성 실패: ${exportError.message}`);
      }

      // 2. 요약 정보 및 해시 생성 (syncManager.js와 동일한 로직)
      const { getLocalDataSummary } = await import('../db/adapter');
      const localSummary = await getLocalDataSummary(currentUser.userId);
      const buffer = await zipBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const appProperties = {
        ...localSummary,
        contentHash,
      };

      // 3. Google Drive에 ZIP 파일과 메타데이터 업로드
      const result = await googleDriveService.syncToGoogleDrive(
        zipBlob,
        appProperties,
        (percent) => setBackupProgress(percent)
      );

      setBackupProgress(100);
      showToast(`백업 완료: ${result.file.name}`, 'success');

      // SyncManager에게 성공 알림 (상태 업데이트 및 에러 클리어)
      await syncManager.notifySyncSuccess(result);

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
    if (!confirm(`"${fileName}"을(를) 복원하시겠습니까?\n\n클라우드의 데이터가 현재 기기에 병합됩니다.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setRestoreProgress(0);

      showToast('복원을 시작합니다...', 'info');

      // 1. Google Drive에서 ZIP 파일 다운로드 (ArrayBuffer)
      const restoredData = await googleDriveService.restoreFromGoogleDrive(fileId);

      if (!restoredData || !restoredData.blob) {
        throw new Error('Google Drive에서 파일을 다운로드하지 못했습니다.');
      }

      // 2. Blob을 ArrayBuffer로 변환하여 importUserData에 전달
      const zipArrayBuffer = await restoredData.blob.arrayBuffer();
      // importUserData가 내부에서 ZIP을 파싱하고 이미지를 복원합니다
      const { importUserData } = await import('../db/adapter');
      await importUserData(currentUser.userId, zipArrayBuffer, true); // true = 병합
      setRestoreProgress(100);

      showToast('복원이 완료되었습니다.', 'success');

      // 충돌 해결 후 또는 데이터 복원 후 상태 갱신을 위해 동기화 재시도
      if (status === SyncStatus.CONFLICT || onDataRestored) {
        console.log('충돌 해결(Pull) 또는 데이터 복원 후 동기화 상태를 갱신합니다.');
        triggerSync({ silent: true, isManual: true });
      }

      // Add a small delay to allow any pending Service Worker messages to complete
      // This is a diagnostic measure for "message channel closed" error
      setTimeout(() => {
        handleClose(); // 복원 후 패널 닫기
      }, 500); // 500ms delay
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

    setIsLoading(true);
    try {
      await googleDriveService.deleteBackupFile(fileId);
      showToast('백업 파일이 삭제되었습니다', 'success');
      await loadBackupFiles();
    } catch (error) {
      console.error('삭제 오류:', error);
      showToast('삭제 실패', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportZip() {
    try {
      const { exportUserDataAsZip } = await import('../db/adapter');
      const blob = await exportUserDataAsZip(currentUser.userId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diary_backup_${currentUser.email}_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ZIP 파일로 내보내기 완료', 'success');
    } catch (error) {
      console.error('내보내기 오류:', error);
      showToast('내보내기 실패', 'error');
    }
  }

  async function handleImportZip(e) {
    const file = e.target.files[0];
    if (!file) return;

    // We will merge data, so a simple confirmation is enough.
    if (!confirm(`'${file.name}' 파일을 가져오시겠습니까?\n\n데이터가 현재 기기에 병합됩니다.`)) {
      e.target.value = '';
      return;
    }

    try {
      // Read file as ArrayBuffer for importUserData
      const { importUserData } = await import('../db/adapter');
      const data = await file.arrayBuffer();
      // Import with merge mode (true) to prevent data loss and duplication issues
      await importUserData(currentUser.userId, data, true);
      showToast('데이터를 성공적으로 가져왔습니다.', 'success');
      // 데이터가 복원되었음을 부모에게 알림
      if (onDataRestored) {
        onDataRestored();
      }

      // SyncContext를 통해 부모 컴포넌트의 데이터 재로드 트리거
      if (triggerSync) {
        triggerSync({ silent: false }); // UI 업데이트 및 사용자 피드백을 위해 동기화 트리거
      }
      handleClose();
    } catch (error) {
      console.error('ZIP 가져오기 오류:', error);
      showToast(`가져오기 실패: ${error.message}`, 'error');
    }
    e.target.value = ''; // 동일한 파일을 다시 선택할 수 있도록 초기화
  }

  async function handleImportTxt(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`'${file.name}' 텍스트 파일을 가져오시겠습니까?\n\n파일의 내용을 분석하여 일기를 추가합니다.`)) {
      e.target.value = '';
      return;
    }

    try {
      const textContent = await file.text();
      const { parseTxtDiary } = await import('../utils/txtDiaryParser');
      const entries = parseTxtDiary(textContent, currentUser.userId);

      if (entries.length === 0) {
        showToast('파일에서 유효한 일기 데이터를 찾지 못했습니다.', 'warning');
        return;
      }

      const { bulkAddEntries } = await import('../db/adapter');
      const addedCount = await bulkAddEntries(entries);

      showToast(`${addedCount}개의 일기를 성공적으로 가져왔습니다.`, 'success');

      if (onDataRestored) onDataRestored();
      handleClose();

    } catch (error) {
      console.error('TXT 가져오기 오류:', error);
      showToast(`가져오기 실패: ${error.message}`, 'error');
    }
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
          <div>
            <h2>💾 백업 및 동기화</h2>
            <p className="backup-user-info">사용자: {currentUser.name || currentUser.email}</p>
          </div>
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
                  {googleUser && (
                    <>
                      {googleUser.imageUrl && (
                        <img src={googleUser.imageUrl} alt="프로필" />
                      )}
                      <div>
                        <div className="user-name">{googleUser.name}</div>
                        <div className="user-email">{googleUser.email}</div>
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
                    📤 지금 백업하기 (수동)
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => triggerSync({ silent: false, isManual: true })
                      .then(() => {
                        loadBackupFiles(); // 동기화 후 목록 새로고침
                      }).catch(err => {
                        console.error("수동 동기화 실패:", err);
                        // 토스트는 SyncProvider에서 이미 표시됨
                      })}
                    disabled={status === SyncStatus.SYNCING}
                  >
                    {status === SyncStatus.SYNCING ? '🔄 동기화 중...' : '🔄 지금 동기화'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={loadBackupFiles}
                    disabled={isLoading}
                  >
                    🔄 목록 새로고침
                  </button>
                </div>

                {status === SyncStatus.CONFLICT && (
                  <div className="sync-status-info conflict">
                    <div className="conflict-header-info">
                      <h4>⚠️ 동기화 충돌</h4>
                      <p>{lastError || '다른 기기와 데이터 충돌이 발생했습니다.'}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => showToast('충돌 해결 모달이 이미 열려있습니다.')}
                    >
                      충돌 해결하기
                    </button>
                  </div>
                )}

                <div className="sync-status-info">
                  <strong>동기화 상태:</strong> <span className={`status-${status.toLowerCase()}`}>{status}</span> <br />
                  <strong>마지막 동기화:</strong> {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : '없음'}
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
                      {backupFiles.map((file, index) => (
                        <BackupListItem
                          key={file.id}
                          file={file}
                          isLatest={index === 0}
                          isLoading={isLoading}
                          onRestore={handleRestore}
                          onDelete={handleDeleteBackup}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 수동 백업 섹션 */}
          <section className="backup-section">
            <h3>💾 수동 백업 (로컬)</h3>
            <p>일기 데이터를 ZIP 파일로 컴퓨터에 저장하거나, 저장된 파일을 복원합니다.</p>
            <div className="manual-backup-actions">
              <button
                className="btn btn-secondary"
                onClick={handleExportZip}
              >
                📥 ZIP으로 내보내기
              </button>
              <label className="btn btn-secondary">
                📤 ZIP 가져오기
                <input
                  type="file"
                  accept=".zip,application/zip"
                  style={{ display: 'none' }}
                  onChange={handleImportZip}
                />
              </label>
              <label className="btn btn-secondary">
                📄 TXT 가져오기
                <input
                  type="file"
                  accept=".txt,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleImportTxt}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function BackupListItem({ file, isLatest, isLoading, onRestore, onDelete }) {
  return (
    <div className="file-item">
      <div className="file-info">
        <div className="file-main-text">
          <span className="file-date">
            {googleDriveService.constructor.formatDate(file.createdTime)}
          </span>
          {isLatest && (
            <span className="latest-backup-badge">가장 최근</span>
          )}
        </div>
        <div className="file-sub-text">
          <span className="file-name">{file.name}</span>
          {' · '}
          <span className="file-size">{googleDriveService.constructor.formatFileSize(file.size)}</span>
        </div>
      </div>
      <div className="file-actions">
        <button
          className="btn btn-small btn-primary"
          onClick={() => onRestore(file.id, file.name)}
          disabled={isLoading}
        >
          복원
        </button>
        <button
          className="btn btn-small btn-danger"
          onClick={() => onDelete(file.id, file.name)}
          disabled={isLoading}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
