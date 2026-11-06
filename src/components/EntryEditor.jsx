import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import './EntryEditor.css';
import { useToast } from '../hooks/useToast';
import { useUiSettings } from '../contexts/useUiSettings';
import { Icon } from './Icon';
import { Lightbox } from './ImageCarousel';
import { noAutofillProps } from '../utils/noAutofill';

const FONT_SIZES = ['small', 'medium', 'large'];
const FONT_SIZE_LABELS = { small: '작게', medium: '보통', large: '크게' };

// '#회고, 운동' → ['회고', '운동']
const splitTags = (text) => text.split(',').map(t => t.trim().replace(/^#+/, '')).filter(Boolean);

// 본문 입력칸. iOS 가 textarea 에는 어떤 속성으로도 '자동 완성 연락처' 버튼을 띄워서
// contenteditable 로 받는다 (2026-09-30 iPhone 실기기 실측)
function PlainTextEditable({ value, onChange, placeholder, className, style }) {
  const ref = useRef(null);

  // 바깥에서 값이 바뀐 경우(일기 전환·취소)에만 DOM 을 덮어쓴다. 입력 중에 덮어쓰면 커서가 튄다
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== value) el.innerText = value;
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="일기 본문"
      aria-placeholder={placeholder}
      data-placeholder={placeholder}
      className={`${className}${value ? '' : ' is-empty'}`}
      style={style}
      onInput={(e) => onChange(e.currentTarget.innerText)}
    />
  );
}

export function EntryEditor({ entry, onSave, isEditing, setIsEditing, onImageDelete, onDelete, onWrite }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: []
  });
  const [tagDraft, setTagDraft] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [hasRemovedPhoto, setHasRemovedPhoto] = useState(false);
  const { settings, updateSetting } = useUiSettings();
  const { fontSize, fontFamily } = settings;

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const loadedEntryKeyRef = useRef(null);
  const { showToast } = useToast();

  // entry prop을 기반으로 폼 데이터를 리셋하는 함수
  const resetFormFromEntry = useCallback((currentEntry) => {
    setFormData({
      title: currentEntry?.title || '',
      content: currentEntry?.content || '',
      tags: currentEntry?.tags || []
    });
    setTagDraft('');
    setSelectedFiles([]);
    setHasRemovedPhoto(false);
  }, []);

  useEffect(() => {
    if (entry) {
      // 작성 중 사진을 지우면 entry 의 images 만 바뀐다. 이때 폼을 리셋하면 입력하던 글이 사라진다
      const entryKey = `${entry.date}|${entry.updatedAt}`;
      if (loadedEntryKeyRef.current === entryKey) return;
      loadedEntryKeyRef.current = entryKey;

      // 새로운 entry가 로드될 때마다 fade-in 애니메이션 트리거
      setIsAnimating(true);
      resetFormFromEntry(entry);

      // 애니메이션 후 상태 리셋
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [entry, resetFormFromEntry]);

  // 컴포넌트 언마운트 시 생성된 Object URL 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
  }, [selectedFiles]);

  // 모바일 전체 화면 작성 중에는 뒤의 페이지를 고정한다. 스크롤할 대상이 없어야
  // iOS 가 키보드를 피하려고 바깥 화면을 밀지 못한다 (스타일은 EntryEditor.css 의 html.editor-open)
  useEffect(() => {
    if (!isEditing || !window.matchMedia('(max-width: 768px)').matches) return;
    const root = document.documentElement;
    const scrollTop = document.body.scrollTop || window.scrollY;
    root.classList.add('editor-open');
    return () => {
      root.classList.remove('editor-open');
      // body 가 고정에서 풀릴 때 위치가 0 으로 돌아가는 브라우저를 위해 되돌려 놓는다
      document.body.scrollTop = scrollTop;
      window.scrollTo(0, scrollTop);
    };
  }, [isEditing]);

  // 시안의 본문 글꼴(A) 버튼: 누를 때마다 글자 크기가 다음 단계로 간다
  const cycleFontSize = () => {
    const next = FONT_SIZES[(FONT_SIZES.indexOf(fontSize) + 1) % FONT_SIZES.length];
    updateSetting('fontSize', next);
    showToast(`글자 크기: ${FONT_SIZE_LABELS[next]}`, 'success', 800);
  };

  const handleSave = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      await onSave({
        date: entry.date,
        title: formData.title,
        // contenteditable 은 끝에서 줄바꿈·붙여넣기 할 때 innerText 끝에 줄바꿈을 덧붙인다
        content: formData.content.replace(/\n+$/, ''),
        // 칩으로 확정하지 않고 입력칸에 남아 있는 태그도 함께 저장한다
        tags: [...new Set([...formData.tags, ...splitTags(tagDraft)])]
      }, selectedFiles);

      showToast('일기가 저장되었습니다', 'success');
      setIsEditing(false);
      setSelectedFiles([]);
      setTagDraft('');
      setHasRemovedPhoto(false);
    } catch (error) {
      console.error('저장 오류:', error);
      showToast(`저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`, 'error', 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // 자동 저장이 없어 닫으면 입력이 사라진다 (D31)
    if (isDirty && !window.confirm('저장하지 않은 내용이 있습니다. 닫을까요?')) return;
    resetFormFromEntry(entry);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    const textToCopy = (isEditing ? formData.content : entry.content || '').trim();
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
    setHasRemovedPhoto(true);
  };

  const addTags = (list) => {
    setFormData(prev => ({ ...prev, tags: [...new Set([...prev.tags, ...list])] }));
  };

  const commitTagDraft = () => {
    addTags(splitTags(tagDraft));
    setTagDraft('');
  };

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // 모바일 키보드는 keydown 으로 쉼표를 알려 주지 않아 입력값에서 나눈다
  const handleTagDraftChange = (e) => {
    const parts = e.target.value.split(',');
    const rest = parts.pop();
    if (parts.length > 0) addTags(splitTags(parts.join(',')));
    setTagDraft(rest);
  };

  const handleTagKeyDown = (e) => {
    // 한글 조합 중의 Enter 는 글자를 확정하는 입력이다
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTagDraft();
    } else if (e.key === 'Backspace' && !tagDraft && formData.tags.length > 0) {
      removeTag(formData.tags[formData.tags.length - 1]);
    }
  };

  if (!entry) {
    return (
      <div className="entry-editor empty">
        <div className="empty-state">
          <div className="empty-icon"><Icon name="pencil" size={48} /></div>
          <p>날짜를 선택하여 일기를 작성하세요</p>
        </div>
      </div>
    );
  }

  const isDirty = formData.title !== (entry.title || '')
    || formData.content.replace(/\n+$/, '') !== (entry.content || '')
    || formData.tags.join(',') !== (entry.tags || []).join(',')
    || tagDraft.trim() !== ''
    || selectedFiles.length > 0
    || hasRemovedPhoto;

  const images = entry.images || [];
  const imageCount = images.length + selectedFiles.length;
  const tags = entry.tags || [];
  const hasSavedContent = !!(entry.title || entry.content || images.length > 0);
  const isEmptyEntry = !entry.title && !entry.content;

  const entryDate = parseISO(entry.date);
  const dateLabel = format(entryDate, 'M월 d일');
  const weekdayLabel = format(entryDate, 'EEEE', { locale: ko });
  const savedAt = entry.updatedAt ? new Date(entry.updatedAt) : null;
  const savedLabel = savedAt && isValid(savedAt)
    ? format(savedAt, format(savedAt, 'yyyy-MM-dd') === entry.date ? 'a h:mm' : 'M월 d일 a h:mm', { locale: ko })
    : null;
  const contentLength = (isEditing ? formData.content : entry.content || '').length.toLocaleString();

  const lightbox = lightboxIndex !== null && images[lightboxIndex] && (
    <Lightbox
      images={images}
      index={lightboxIndex}
      onIndexChange={setLightboxIndex}
      onClose={() => setLightboxIndex(null)}
    />
  );

  if (isEditing) {
    return (
      <div className={`entry-editor is-editing ${isAnimating ? 'fade-in-up' : ''}`}>
        <header className="editor-head">
          <button type="button" className="editor-icon-button" aria-label="닫기" onClick={handleCancel} disabled={isSaving}>
            <Icon name="close" size={21} />
          </button>
          <div className="editor-head-center">
            <div className="editor-head-date">{dateLabel} {weekdayLabel}</div>
            <div className="editor-head-state">{isDirty ? '저장하지 않은 변경이 있습니다' : '변경 사항 없음'}</div>
          </div>
          {/* 모바일에서는 키보드가 맨 아래 도구줄의 삭제 버튼을 가려서 위쪽에도 둔다 */}
          {hasSavedContent && (
            <button type="button" className="editor-icon-button is-danger editor-head-delete" aria-label="이 일기 삭제" onClick={onDelete} disabled={isSaving}>
              <Icon name="trash" size={20} />
            </button>
          )}
          <button type="button" className="editor-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </header>

        <div className="editor-photos">
          <button
            type="button"
            className="editor-photo-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageCount >= 10}
          >
            <Icon name="plus" size={18} />
            <span>{imageCount >= 10 ? '최대 10장' : `사진 ${imageCount}/10`}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {images.map((img, index) => (
            <span key={img.id} className="editor-photo">
              <button type="button" className="editor-photo-open" aria-label={`사진 ${index + 1} 크게 보기`} onClick={() => setLightboxIndex(index)}>
                <img src={img.thumbnailUrl} alt="" />
              </button>
              <button type="button" className="editor-photo-remove" aria-label={`사진 ${index + 1} 삭제`} onClick={() => handleDeleteExistingImage(img.id)}>
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}

          {selectedFiles.map((file, index) => (
            <span key={file.preview} className="editor-photo is-new" title={file.name}>
              <img src={file.preview} alt={`추가할 사진 ${index + 1}`} />
              <button type="button" className="editor-photo-remove" aria-label={`추가할 사진 ${index + 1} 빼기`} onClick={() => handleRemoveSelectedFile(index)}>
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>

        {/* iOS '자동 완성 연락처' 버튼은 autocomplete="off" 로는 안 사라져 입력칸에 noAutofillProps 를 쓴다 */}
        <form className={`editor-form font-size-${fontSize}`} autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            className="input-title"
            autoComplete="off"
            {...noAutofillProps}
            aria-label="제목"
            placeholder="제목 (선택)"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            style={{ fontFamily }}
          />

          <PlainTextEditable
            className="input-content"
            placeholder={'오늘 하루는 어땠나요?\n자유롭게 작성해보세요...'}
            value={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
            style={{ fontFamily }}
          />
        </form>

        <div className="editor-tags">
          {formData.tags.map(tag => (
            <span key={tag} className="editor-tag">
              <span className="editor-tag-name">#{tag}</span>
              <button type="button" aria-label={`${tag} 태그 제거`} onClick={() => removeTag(tag)}>
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            className="input-tags"
            autoComplete="off"
            {...noAutofillProps}
            aria-label="태그 추가"
            placeholder="# 태그 추가"
            value={tagDraft}
            onChange={handleTagDraftChange}
            onKeyDown={handleTagKeyDown}
            onBlur={(e) => { noAutofillProps.onBlur(e); commitTagDraft(); }}
          />
        </div>

        <div className="editor-tools">
          <button type="button" className="editor-icon-button" aria-label={`글자 크기 바꾸기 (지금: ${FONT_SIZE_LABELS[fontSize]})`} title="글자 크기" onClick={cycleFontSize}>
            <Icon name="font" size={20} />
          </button>
          <button type="button" className="editor-icon-button" aria-label="본문 복사" title="본문 복사" onClick={handleCopy}>
            <Icon name="copy" size={20} />
          </button>
          {hasSavedContent && (
            <button type="button" className="editor-icon-button is-danger" aria-label="이 일기 삭제" title="이 일기 삭제" onClick={onDelete}>
              <Icon name="trash" size={20} />
            </button>
          )}
          <span className="editor-tools-spacer" />
          <span className="editor-tools-count">{contentLength}자</span>
        </div>

        {lightbox}
      </div>
    );
  }

  return (
    <div className={`entry-editor ${isAnimating ? 'fade-in-up' : ''}`}>
      {/* 데스크톱: 일기 카드 전체 (시안 Main) */}
      <article className={`entry-article font-size-${fontSize}`}>
        <div className="entry-article-head">
          <div className="entry-article-heading">
            <div className="entry-article-date">
              <h1>{dateLabel}</h1>
              <span>{weekdayLabel}{savedLabel && ` · ${savedLabel} 저장`}</span>
            </div>
            <div className="entry-tags">
              {tags.map(tag => <span key={tag} className="entry-tag">#{tag}</span>)}
              <button type="button" className="entry-tag-add" onClick={() => setIsEditing(true)}>+ 태그</button>
            </div>
          </div>
          <div className="entry-article-actions">
            <button type="button" className="entry-action" onClick={() => setIsEditing(true)}>
              <Icon name="pencil" size={16} />{isEmptyEntry ? '쓰기' : '수정'}
            </button>
            <button type="button" className="entry-action is-icon" aria-label="글자 크기 바꾸기" title={`글자 크기: ${FONT_SIZE_LABELS[fontSize]}`} onClick={cycleFontSize}>
              <Icon name="font" size={16} />
            </button>
            {entry.content && (
              <button type="button" className="entry-action is-icon" aria-label="본문 복사" title="본문 복사" onClick={handleCopy}>
                <Icon name="copy" size={16} />
              </button>
            )}
            {hasSavedContent && (
              <button type="button" className="entry-action is-icon is-danger" aria-label="이 일기 삭제" title="이 일기 삭제" onClick={onDelete}>
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="entry-view-content" style={{ fontFamily }}>
          {entry.title && <h2 className="entry-view-title">{entry.title}</h2>}
          {entry.content ? (
            entry.content.split('\n').map((line, i) => (
              line ? <p key={i}>{line}</p> : null
            ))
          ) : (
            <p className="placeholder">내용이 없습니다...</p>
          )}
        </div>

        <div className="entry-article-foot">
          <span className="entry-article-stats">
            {contentLength}자{images.length > 0 && ` · 사진 ${images.length}장`}
          </span>
          <button type="button" className="btn btn-primary" onClick={onWrite}>
            <Icon name="plus" size={16} />오늘 일기 쓰기
          </button>
        </div>
      </article>

      {/* 모바일: 선택한 날 요약 카드. 누르면 작성 화면 (시안 Mobile, D31) */}
      <button type="button" className="entry-summary" onClick={() => setIsEditing(true)}>
        <span className="entry-summary-date">
          <strong>{dateLabel}</strong>
          <span>{weekdayLabel}</span>
        </span>
        {entry.title && <span className="entry-summary-title" style={{ fontFamily }}>{entry.title}</span>}
        <span className="entry-summary-text" style={{ fontFamily }}>
          {entry.content || (entry.title ? '' : '아직 기록이 없습니다. 눌러서 오늘을 남겨 보세요.')}
        </span>
        {images.length > 0 && (
          <span className="entry-summary-photos">
            {images.slice(0, images.length > 3 ? 2 : 3).map(img => (
              <img key={img.id} src={img.thumbnailUrl} alt="" />
            ))}
            {images.length > 3 && <span className="entry-summary-more">+{images.length - 2}</span>}
          </span>
        )}
        {tags.length > 0 && (
          <span className="entry-summary-tags">
            {tags.slice(0, 3).map(tag => <span key={tag} className="entry-tag">#{tag}</span>)}
            {tags.length > 3 && <span className="entry-tag-more">+{tags.length - 3}</span>}
          </span>
        )}
      </button>
    </div>
  );
}
