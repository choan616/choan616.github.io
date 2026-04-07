import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import './ImageGallery.css';
import { base64ToBlob } from '../utils/imageCompression';

// 이미지 URL 생성 및 정리를 담당하는 내부 컴포넌트
const GalleryImage = ({ blob, alt }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  if (!src) return <div className="gallery-image-placeholder" />;
  return <img src={src} alt={alt} loading="lazy" />;
};

export function ImageGallery({ userId, onEntryClick, onClose }) {
  // DB에서 직접 이미지와 일기 데이터를 조회
  const galleryItems = useLiveQuery(async () => {
    if (!userId) return [];
    
    try {
      const { db } = await import('../db/db');
      
      // 1. 이미지 데이터 조회 (삭제되지 않은 것)
      const images = await db.images.where({ userId }).and(i => !i.deletedAt).toArray();
      if (images.length === 0) return [];

      // 2. 일기 데이터 조회 (제목 매핑용)
      const entries = await db.entries.where({ userId }).and(e => !e.deletedAt).toArray();
      const entryMap = new Map(entries.map(e => [e.date, e]));

      // 3. 데이터 결합 및 가공
      return images.map(img => {
        const imageSrc = img.thumbnail || img.blob;
        const imageBlob = imageSrc ? base64ToBlob(imageSrc) : null;
        return {
          id: img.id,
          blob: imageBlob,
          date: img.entryDate,
          title: entryMap.get(img.entryDate)?.title || '',
          imageCount: 1 // 개별 이미지 단위로 표시
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error("Failed to load gallery items:", error);
      return [];
    }
  }, [userId]);

  // 연도-월별 그룹화
  const groupedItems = useMemo(() => {
    if (!galleryItems) return {};
    const groups = {};
    galleryItems.forEach(item => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [galleryItems]);

  if (!galleryItems || galleryItems.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="gallery-empty-icon">🖼️</div>
        <p>사진이 포함된 일기가 없습니다.</p>
        <button className="btn-back-diary" onClick={onClose}>일기 쓰러 가기</button>
      </div>
    );
  }

  return (
    <div className="image-gallery-container">
      <div className="gallery-header">
        <div className="gallery-title-area">
          <h2>사진 모아보기</h2>
          <span className="gallery-count">총 {galleryItems ? galleryItems.length : 0}장</span>
        </div>
        <button className="gallery-close-btn" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      
      <div className="gallery-content">
        {Object.entries(groupedItems).map(([groupTitle, items]) => (
          <div key={groupTitle} className="gallery-group">
            <h3 className="gallery-group-title">{groupTitle}</h3>
            <div className="gallery-grid">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="gallery-item" 
                  onClick={() => onEntryClick(item.date)}
                  title={`${item.date} 일기 보기`}
                >
                  <div className="gallery-image-wrapper">
                    <GalleryImage blob={item.blob} alt={item.title} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}