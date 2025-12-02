import React, { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast';
import { deleteImage } from '../db/adapter';
import './EntryEditor.css';

export function EntryEditor({ entry, onSave, isEditing, setIsEditing }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        content: entry.content || '',
        tags: (entry.tags || []).join(', ')
      });
      setSelectedFiles([]);
    }
  }, [entry]);

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
      showToast('저장 중 오류가 발생했습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: entry?.title || '',
      content: entry?.content || '',
      tags: (entry?.tags || []).join(', ')
    });
    setSelectedFiles([]);
    setIsEditing(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // 이미지 파일만 필터링
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      showToast('이미지 파일만 업로드할 수 있습니다', 'warning');
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleRemoveSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = async (imageId) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteImage(imageId);
      showToast('이미지가 삭제되었습니다', 'success');

      // 부모 컴포넌트에 새로고침 요청
      if (onSave) {
        window.location.reload(); // 임시 방편, 더 나은 방법은 상태 관리
      }
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      showToast('이미지 삭제 중 오류가 발생했습니다', 'error');
    }
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
    <div className="entry-editor">
      <div className="editor-toolbar">
        {isEditing ? (
          <>
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '💾 저장'}
            </button>
            <button
              className="btn btn-cancel"
              onClick={handleCancel}
              disabled={isSaving}
            >
              취소
            </button>
          </>
        ) : (
          <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
            {isEmptyEntry ? '✏️ 쓰기' : '✏️ 편집'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="editor-form">
          <input
            type="text"
            className="input-title"
            placeholder="제목을 입력하세요"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <textarea
            className="input-content"
            placeholder="오늘 하루는 어땠나요?&#10;자유롭게 작성해보세요..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />

          <input
            type="text"
            className="input-tags"
            placeholder="태그 (쉼표로 구분, 예: 여행, 맛집, 친구)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />

          <div className="image-upload-section">
            <div className="upload-header">
              <h3>이미지 추가</h3>
              <button
                className="btn btn-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 이미지 선택
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
                        className="btn-delete-image"
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
                      <img src={URL.createObjectURL(file)} alt="새 이미지" />
                      <button
                        className="btn-delete-image"
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
        <div className="viewer-content">
          <h1 className="entry-title">{entry.title || '제목 없음'}</h1>

          <div className="entry-meta">
            <span className="entry-date">📅 {entry.date}</span>
            {entry.tags && entry.tags.length > 0 && (
              <div className="entry-tags">
                {entry.tags.map((tag, i) => (
                  <span key={i} className="tag">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="entry-content">
            {entry.content ? (
              entry.content.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))
            ) : (
              <p className="placeholder">내용이 없습니다...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
