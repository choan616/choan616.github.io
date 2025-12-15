import React from 'react';
import './Layout.css';

export function Layout({ children, currentEntry, userProfileButton }) {
  const hasImages = currentEntry?.images && currentEntry.images.length > 0;


  // 이미지가 없을 경우 캐러셀 영역을 숨깁니다.
  const showCarousel = hasImages;

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <h1>My Diary</h1>
        {userProfileButton && (
          <div className="header-profile">{userProfileButton}</div>
        )}
      </header>

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-main-content">
            {/* Desktop Sidebar Header */}
            <div className="desktop-sidebar-header">
              <h1>My Diary</h1>
              {userProfileButton && ( // 이 부분이 누락된 버튼을 추가합니다.
                <div className="sidebar-profile">{userProfileButton}</div>
              )}
            </div>
          </div>
          {/* Calendar is now part of the Sidebar flow */}
          <section className="content-sidebar">
            {children.sidebar}
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
            {hasImages && (
              <div className="content-top">
                {children.carousel}
              </div>
            )}
            {/* Bottom Section - Entry Editor */}
            <div className={`content-bottom ${!showCarousel ? 'full-height' : ''}`}>
              {children.editor}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
