import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { googleDriveService } from '../services/googleDrive';
import { useToast } from '../hooks/useToast';
import './ConflictResolutionModal.css';

export function ConflictResolutionModal({ currentUser, remoteMetadata, localModifiedTime, onClose, onResolve }) {
  const [isLoading, setIsLoading] = useState(true);
  const [localContent, setLocalContent] = useState(null);
  const [remoteContent, setRemoteContent] = useState(null);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    async function loadConflictData() {
      try {
        setIsLoading(true);
        setError('');

        // 1. 원격 데이터(ZIP) 가져오기
        const remoteZipBlob = await googleDriveService.restoreFromGoogleDrive(remoteMetadata.id);
        if (!remoteZipBlob) throw new Error('원격 데이터를 가져올 수 없습니다.');

        // 2. 로컬 데이터(ZIP) 가져오기
        const { exportUserDataAsZip } = await import('../db/adapter');
        const localZipBlob = await exportUserDataAsZip(currentUser.userId);

        // 3. 각 ZIP에서 entries.json 추출 및 파싱
        const extractEntries = async (blob) => {
          if (!blob || blob.size < 22) return null;
          const zip = await JSZip.loadAsync(blob);
          const entriesFile = zip.file('entries.json');
          if (entriesFile) {
            const content = await entriesFile.async('string');
            return JSON.parse(content);
          }
          return null;
        };

        const remoteEntries = await extractEntries(remoteZipBlob);
        const localEntries = await extractEntries(localZipBlob);

        setRemoteContent(remoteEntries);
        setLocalContent(localEntries);

      } catch (err) {
        console.error('충돌 데이터 로드 오류:', err);
        setError('데이터를 비교하는 중 오류가 발생했습니다. 수동으로 해결해주세요.');
        showToast('충돌 데이터 로드 실패', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadConflictData();
  }, [remoteMetadata, currentUser.userId, showToast]);

  const handleResolve = (resolution) => {
    if (onResolve) {
      onResolve(resolution);
    }
    onClose();
  };

  const renderContent = (title, data, modifiedTime) => (
    <div className="conflict-data-column">
      <h3>{title}</h3>
      <div className="conflict-meta">
        최종 수정: {new Date(modifiedTime).toLocaleString('ko-KR')}
      </div>
      <pre className="conflict-content-box">
        {isLoading ? '로딩 중...' : (data ? JSON.stringify(data, null, 2) : '데이터 없음')}
      </pre>
    </div>
  );

  return (
    <>
      <div className="backup-panel-overlay" onClick={onClose} />
      <div className="conflict-resolution-modal">
        <div className="conflict-header">
          <h2>⚠️ 동기화 충돌 해결</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="conflict-body">
          <p className="conflict-guide">
            로컬 데이터와 클라우드 데이터가 모두 변경되었습니다.
            아래 내용을 비교하고 유지할 버전을 선택하세요.
          </p>

          {error && <div className="error-message">{error}</div>}

          <div className="conflict-comparison-area">
            {renderContent('💻 로컬 데이터 (현재 기기)', localContent, localModifiedTime)}
            {renderContent('☁️ 클라우드 데이터', remoteContent, remoteMetadata.modifiedTime)}
          </div>
        </div>
        <div className="conflict-footer">
          <button
            className="btn btn-primary"
            onClick={() => handleResolve('push')}
            disabled={isLoading}
          >
            💻 로컬 데이터 유지 (클라우드에 덮어쓰기)
          </button>
          <button
            className="btn btn-success"
            onClick={() => handleResolve('pull')}
            disabled={isLoading}
          >
            ☁️ 클라우드 데이터 사용 (로컬에 덮어쓰기)
          </button>
        </div>
      </div>
    </>
  );
}