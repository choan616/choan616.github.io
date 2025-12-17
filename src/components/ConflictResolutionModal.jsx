import React from 'react';
import './ConflictResolutionModal.css';

export function ConflictResolutionModal({ remoteMetadata, localModifiedTime, localSummary, onClose, onResolve }) {

  const handleResolve = (resolution) => {
    if (onResolve) {
      onResolve(resolution);
    }
  };

  const renderContent = (title, data, modifiedTime) => (
    <div className="conflict-data-column">
      <h3>{title}</h3>
      <div className="conflict-meta">
        최종 수정: {new Date(modifiedTime).toLocaleString('ko-KR')}
      </div>
      <div className="conflict-content-box">
        {data ? (
          <>
            <div>일기: {data.entryCount || 0}개</div>
            <div>이미지: {data.imageCount || 0}개</div>
            <div className="conflict-hash" title={data.contentHash}>
              버전: {data.contentHash ? data.contentHash.substring(0, 12) : '알 수 없음'}
            </div>
          </>
        ) : '요약 정보 없음'}
      </div>
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

          <div className="conflict-comparison-area">
            {renderContent('💻 로컬 데이터 (현재 기기)', localSummary, localModifiedTime)}
            {renderContent('☁️ 클라우드 데이터', remoteMetadata?.appProperties, remoteMetadata?.modifiedTime)}
          </div>
        </div>
        <div className="conflict-footer">
          <button
            className="btn btn-primary"
            onClick={() => handleResolve('push')}
          >
            💻 로컬 데이터 유지 (클라우드에 덮어쓰기)
          </button>
          <button
            className="btn btn-success"
            onClick={() => handleResolve('pull')}
          >
            ☁️ 클라우드 데이터 사용 (로컬에 덮어쓰기)
          </button>
        </div>
      </div>
    </>
  );
}