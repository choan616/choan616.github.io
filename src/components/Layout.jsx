import React from 'react';
import './Layout.css';
import { useSession } from '../contexts/useSession';
import { Logo } from './Logo';

export function Layout({ sidebar, main, carousel, userProfileButton, mobileActions, bottomNav }) {
  const showCarousel = !!carousel;
  const { isLocked } = useSession();

  return (
    <div className={`app-layout ${isLocked ? 'locked' : ''}`}>
      {/* Mobile Header: 로고 / 검색 등 동작 / 프로필 */}
      <header className="mobile-header">
        <Logo className="mobile-logo" size="60" />
        <div className="mobile-header-actions">
          {mobileActions}
          {userProfileButton && (
            <div className="header-profile">{userProfileButton}</div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-main-content">
            {/* Desktop Sidebar Header */}
            <div className="desktop-sidebar-header">
              <Logo className="sidebar-logo" size="80" />
              {userProfileButton && (
                <div className="sidebar-profile">{userProfileButton}</div>
              )}
            </div>
          </div>
          {/* Calendar is now part of the Sidebar flow */}
          <section className="content-sidebar">
            {sidebar}
          </section>
          {/* Sidebar Footer */}
          <footer className="sidebar-footer">
            {/* This footer is now mainly for desktop or can be repurposed */}
          </footer>
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
