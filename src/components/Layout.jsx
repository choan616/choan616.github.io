import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import './Layout.css';
import { useSession } from '../contexts/useSession';
import { Icon } from './Icon';
import { Logo } from './Logo';

export function Layout({ sidebar, main, carousel, userProfileButton, headerActions, bottomNav, screenTitle, onBack }) {
  const showCarousel = !!carousel;
  const { isLocked } = useSession();

  return (
    <div className={`app-layout ${isLocked ? 'locked' : ''}`}>
      <header className="app-header">
        {/* 모바일에서 홈이 아닌 화면: 뒤로 + 화면 이름 (시안) */}
        {screenTitle && (
          <div className="app-header-screen">
            <button type="button" className="header-icon-button" aria-label="뒤로" onClick={onBack}>
              <Icon name="chevron-left" size={21} />
            </button>
            <strong>{screenTitle}</strong>
          </div>
        )}
        <div className={`app-header-inner${screenTitle ? ' has-screen' : ''}`}>
          <Logo />
          <span className="app-header-date">{format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}</span>
          <span className="app-header-spacer" />
          {headerActions}
          {userProfileButton}
        </div>
      </header>

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <section className="content-sidebar">
            {sidebar}
          </section>
        </aside>

        {/* Main Content */}
        <main className="content-area">
          <section className="content-main">
            {/* Top Section - Image Carousel (conditional) */}
            {showCarousel && (
              <div className="content-top">
                {carousel}
              </div>
            )}
            {/* Bottom Section - Entry Editor */}
            <div className={`content-bottom ${!showCarousel ? 'full-height' : ''}`}>
              {main}
            </div>
          </section>
        </main>
      </div>

      {/* 모바일 하단 탭과 쓰기 버튼 (데스크톱에서는 CSS 로 숨김) */}
      {bottomNav}
    </div>
  );
}
