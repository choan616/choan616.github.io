import React, { useState } from 'react';
import './ImageCarousel.css';

export function ImageCarousel({ images = [] }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const openLightbox = (url) => {
    setSelectedImage(url);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  if (!images || images.length === 0) {
    return (
      <div className="carousel-empty">
        <div className="empty-icon">🖼️</div>
        <p>이미지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="image-grid-container">
      <div className="image-grid">
        {images.map((image, index) => (
          <div
            key={image.id || index}
            className="grid-item"
            onClick={() => openLightbox(image.url)}
          >
            <img
              src={image.thumbnailUrl || image.url}
              alt={`이미지 썸네일 ${index + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
      <div className="image-counter">
        {images.length} 장의 이미지
      </div>

      {selectedImage && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-content">
            <img src={selectedImage} alt="확대 이미지" className="lightbox-image" />
          </div>
          <button className="lightbox-close-button" onClick={closeLightbox}>✕</button>
        </div>
      )}
    </div>
  );
}
