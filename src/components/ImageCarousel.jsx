import React, { useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import './ImageCarousel.css';

export function ImageCarousel({ images = [] }) {
  const swiperRef = useRef(null);

  useEffect(() => {
    // 이미지가 변경될 때 첫 슬라이드로 이동
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current.swiper.slideTo(0);
    }
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="carousel-empty">
        <div className="empty-icon">🖼️</div>
        <p>이미지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="image-carousel">
      <Swiper
        ref={swiperRef}
        modules={[Navigation, Pagination, EffectFade]}
        effect="fade"
        navigation
        pagination={{ clickable: true }}
        loop={false}
        spaceBetween={0}
        slidesPerView={1}
        className="swiper-container"
      >
        {images.map((image, index) => (
          <SwiperSlide key={image.id || index}>
            <div className="slide-content">
              <img
                src={image.url}
                alt={`이미지 ${index + 1}`}
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="image-counter">
        {images.length} 장의 이미지
      </div>
    </div>
  );
}
