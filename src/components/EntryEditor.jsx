import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EntryEditor.css';
import { useToast } from '../hooks/useToast';
import { useUiSettings } from '../contexts/useUiSettings';
import { Icon } from './Icon';

export function EntryEditor({ entry, onSave, isEditing, setIsEditing, onImageDelete, onDelete }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const { settings, updateSetting } = useUiSettings();
  const { fontSize, fontFamily } = settings;

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const entryViewContentRef = useRef(null);
  const { showToast } = useToast();

  // entry prop을 기반으로 폼 데이터를 리셋하는 함수
  const resetFormFromEntry = useCallback((currentEntry) => {
    setFormData({
      title: currentEntry?.title || '',
      content: currentEntry?.content || '',
      tags: (currentEntry?.tags || []).join(', ')
    });
    setSelectedFiles([]);
  }, []);

  useEffect(() => {
    if (entry) {
      // 새로운 entry가 로드될 때마다 fade-in 애니메이션 트리거
      setIsAnimating(true);
      resetFormFromEntry(entry);

      // 애니메이션 후 상태 리셋
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [entry, resetFormFromEntry]);

  // 설정 변경 감지
  const handleFontSizeChange = (size) => {
    updateSetting('fontSize', size);
  };

  // 컴포넌트 언마운트 시 생성된 Object URL 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
  }, [selectedFiles]);

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await onSave({
        date: entry.date,
        title: formData.title,
        content: formData.content,
        tags: tagsArray
      }, selectedFiles);

      showToast('일기가 저장되었습니다', 'success');
      setIsEditing(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('저장 오류:', error);
      showToast(`저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error', 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetFormFromEntry(entry);
    setIsEditing(false);
  };

  // view에 렌더링된 본문을 전체 선택한 뒤 그 선택 영역을 클립보드로 복사
  const handleCopy = async () => {
    const viewEl = entryViewContentRef.current;
    // 본문이 없으면 placeholder 문구가 복사되므로 건너뜀
    if (!viewEl || !entry.content) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(viewEl);
    selection.removeAllRanges();
    selection.addRange(range);

    const textToCopy = selection.toString().trim();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('클립보드에 복사되었습니다', 'success');
    } catch {
      showToast('복사에 실패했습니다', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // 이미지 파일만 필터링
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      showToast('이미지 파일만 업로드할 수 있습니다', 'warning');
    }

    // 10장 제한 체크
    const existingCount = entry.images?.length || 0;
    const selectedCount = selectedFiles.length;
    const totalCount = existingCount + selectedCount + imageFiles.length;

    if (totalCount > 10) {
      const remaining = 10 - existingCount - selectedCount;
      if (remaining <= 0) {
        showToast('최대 10장까지만 업로드할 수 있습니다', 'error');
        return;
      }
      showToast(
        `최대 10장까지 업로드할 수 있습니다. ${remaining}장만 추가됩니다.`,
        'warning'
      );
      const newFiles = imageFiles.slice(0, remaining).map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    } else {
      const newFiles = imageFiles.map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
    // 파일 선택 후 input 값 초기화 (동일 파일 재선택 가능하도록)
    e.target.value = '';
  };

  const handleRemoveSelectedFile = (index) => {
    const fileToRemove = selectedFiles[index];
    URL.revokeObjectURL(fileToRemove.preview); // 메모리 해제
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 이미지 삭제 핸들러: DB에서 직접 삭제하는 대신 부모 컴포넌트에 알리기만 함
  const handleDeleteExistingImage = (imageId) => {
    // 콜백을 통해 부모 컴포넌트(App.jsx)에 즉시 알림
    // App.jsx의 handleImageDelete가 상태를 업데이트하고,
    // 최종 저장은 handleSave에서 처리됨
    onImageDelete(imageId);
  };

  if (!entry) {
    return (
      <div className="entry-editor empty">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>날짜를 선택하여 일기를 작성하세요</p>
        </div>
      </div>
    );
  }

  // 엔트리가 비어있는지 확인 (제목과 내용 모두 없음)
  const isEmptyEntry = !entry.title && !entry.content;

  return (
    <div className={`entry-editor flex flex-col h-full ${isAnimating ? 'fade-in-up' : ''}`}>
      <div className="editor-toolbar flex justify-between items-center p-2 border-b">
        {isEditing ? (
          <div className="flex space-x-2">
            <button
              className="btn btn-primary clickable"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '💾 저장'}
            </button>
            <button
              className="btn btn-secondary clickable"
              onClick={handleCancel}
              disabled={isSaving}
            >
              취소
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              className="btn btn-secondary clickable"
              onClick={handleCopy}
            >
              📋 복사
            </button>
            <button className="btn btn-primary clickable" onClick={() => setIsEditing(true)}>
              {isEmptyEntry ? '✏️ 쓰기' : '✏️ 편집'}
            </button>

            {/* 삭제 버튼 추가 */}
            {entry && (entry.title || entry.content || (entry.images && entry.images.length > 0)) && (
              <button
                className="btn btn-danger-text clickable"
                onClick={onDelete}
              >
                🗑️ 삭제
              </button>
            )}
          </div>
        )}
        {!isEditing && (
          // 텍스트 크기 조절
          <div className="font-size-controls">
            <div className="font-size-labels">
              <span className="label-small" onClick={() => handleFontSizeChange('small')}>A</span>
              <span className="label-medium" onClick={() => handleFontSizeChange('medium')}>A</span>
              <span className="label-large" onClick={() => handleFontSizeChange('large')}>A</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={fontSize === 'small' ? 0 : fontSize === 'medium' ? 1 : 2}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                const size = value === 0 ? 'small' : value === 1 ? 'medium' : 'large';
                handleFontSizeChange(size);
              }}
              onMouseUp={(e) => {
                const value = parseInt(e.target.value);
                const label = value === 0 ? '작게' : value === 1 ? '보통' : '크게';
                showToast(label, 'success', 800);
              }}
              onTouchEnd={(e) => {
                const value = parseInt(e.target.value);
                const label = value === 0 ? '작게' : value === 1 ? '보통' : '크게';
                showToast(label, 'success', 800);
              }}
              className="font-size-slider"
              title="텍스트 크기 조절"
            />
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="editor-form flex-grow overflow-y-auto p-4">
          <input
            type="text"
            className="input-title"
            placeholder="제목을 입력하세요"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            style={{ fontFamily }}
          />

          <textarea
            className="input-content"
            placeholder="오늘 하루는 어땠나요?&#10;자유롭게 작성해보세요..."
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            style={{ fontFamily }}
          />

          <input
            type="text"
            className="input-tags"
            placeholder="태그 (쉼표로 구분, 예: 여행, 맛집, 친구)"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          />

          <div className="image-upload-section">
            <div className="upload-header">
              <h3>
                이미지 추가 (
                {((entry.images?.length || 0) + selectedFiles.length)}/10)
              </h3>
              <button
                className="btn btn-primary btn-small clickable"
                onClick={() => fileInputRef.current?.click()}
                disabled={(entry.images?.length || 0) + selectedFiles.length >= 10}
              >
                {(entry.images?.length || 0) + selectedFiles.length >= 10
                  ? '🚫 최대 10장'
                  : '📷 이미지 선택'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {/* 기존 이미지 */}
            {entry.images && entry.images.length > 0 && (
              <div className="existing-images">
                <h4>현재 이미지</h4>
                <div className="image-grid">
                  {entry.images.map((img) => (
                    <div key={img.id} className="image-thumb">
                      <img src={img.thumbnailUrl} alt="기존 이미지" />
                      <button
                        className="btn-delete-image clickable"
                        onClick={() => handleDeleteExistingImage(img.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 새로 선택한 이미지 미리보기 */}
            {selectedFiles.length > 0 && (
              <div className="new-images">
                <h4>추가할 이미지 ({selectedFiles.length})</h4>
                <div className="image-grid">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="image-thumb">
                      <img src={file.preview} alt="새 이미지" />
                      <button
                        className="btn-delete-image clickable"
                        onClick={() => handleRemoveSelectedFile(index)}
                      >
                        ×
                      </button>
                      <div className="file-name">{file.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`entry-view flex-grow font-size-${fontSize}`} style={{ fontFamily }}>
          <div className="entry-view-header">
            {entry.title && <h1 className="entry-view-title">{entry.title}</h1>}
            <div className="entry-view-meta">
              <span>{entry.date}</span>
            </div>
          </div>

          <div ref={entryViewContentRef} className="entry-view-content">
            {entry.content ? (
              entry.content.split('\n').map((line, i) => (
                line ? <p key={i}>{line}</p> : null
              ))
            ) : (
              <p className="placeholder">내용이 없습니다...</p>
            )}
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="entry-view-tags">
              {entry.tags.map((tag, i) => (
                <span key={i} className="tag-item">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
