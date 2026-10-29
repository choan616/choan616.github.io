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
    <div className="modal-overlay" onClick={onClose}>
      {/* 모달 내부 클릭 시 닫히지 않도록 이벤트 전파 중단 */}
      <div className="conflict-resolution-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          동기화 충돌 해결
        </div>
        <div className="modal-body">
          <p>
            현재 기기의 데이터와 클라우드 데이터가 서로 다릅니다.
            아래 내용을 비교하고 유지할 버전을 선택하세요.
          </p>

          <div className="conflict-comparison-area">
            {renderContent('로컬 데이터 (현재 기기)', localSummary, localModifiedTime)}
            {renderContent('클라우드 데이터', remoteMetadata?.appProperties, remoteMetadata?.modifiedTime)}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-button primary"
            onClick={() => handleResolve('push')}
          >
            로컬 데이터 유지 (클라우드에 덮어쓰기)
          </button>
          <button
            className="modal-button"
            onClick={() => handleResolve('pull')}
          >
            클라우드 데이터 사용 (로컬에 덮어쓰기)
          </button>
        </div>
      </div>
    </div>
  );
}