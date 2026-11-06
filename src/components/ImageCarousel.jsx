import React, { useEffect, useState } from 'react';
import './ImageCarousel.css';
import { Icon } from './Icon';

// 큰 사진 보기. 격자에 없는 사진(+N)까지 넘겨 볼 수 있어 일기 카드와 작성 화면이 함께 쓴다
export function Lightbox({ images, index, onIndexChange, onClose }) {
  const hasMany = images.length > 1;
  const move = (delta) => onIndexChange((index + delta + images.length) % images.length);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (hasMany && e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
      else if (hasMany && e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasMany, images.length, index, onClose, onIndexChange]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <img src={images[index].url} alt={`확대 이미지 ${index + 1}`} className="lightbox-image" onClick={(e) => e.stopPropagation()} />
      <button type="button" className="lightbox-button lightbox-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={24} /></button>
      {hasMany && (
        <>
          <button type="button" className="lightbox-button lightbox-prev" aria-label="이전 사진" onClick={(e) => { e.stopPropagation(); move(-1); }}><Icon name="chevron-left" size={24} /></button>
          <button type="button" className="lightbox-button lightbox-next" aria-label="다음 사진" onClick={(e) => { e.stopPropagation(); move(1); }}><Icon name="chevron-right" size={24} /></button>
          <span className="lightbox-counter">{index + 1} / {images.length}</span>
        </>
      )}
    </div>
  );
}

// 일기 카드 위의 사진: 대표 1장 + 오른쪽 2장, 나머지는 +N (시안)
export function ImageCarousel({ images = [] }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  if (images.length === 0) return null;

  const shown = images.slice(0, 3);
  const hiddenCount = images.length - shown.length;
  const photo = (image, index) => (
    <button
      key={image.id || index}
      type="button"
      className="photo-tile"
      aria-label={`사진 ${index + 1} 크게 보기`}
      onClick={() => setSelectedIndex(index)}
    >
      <img src={image.url} alt="" loading="lazy" />
      {index === 2 && hiddenCount > 0 && <span className="photo-more">+{hiddenCount}</span>}
    </button>
  );

  return (
    <>
      <div className="photo-grid">
        {photo(shown[0], 0)}
        {shown.length > 1 && (
          <div className="photo-grid-side">
            {shown.slice(1).map((image, i) => photo(image, i + 1))}
          </div>
        )}
      </div>

      {selectedIndex !== null && (
        <Lightbox
          images={images}
          index={selectedIndex}
          onIndexChange={setSelectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
}
