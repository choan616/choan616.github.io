import React, { useState } from 'react';
import './Layout.css';
import { useSession } from '../contexts/useSession';
import { Logo } from './Logo';

export function Layout({ sidebar, main, carousel, userProfileButton }) {
  const showCarousel = !!carousel;
  const { isLocked } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-layout ${isLocked ? 'locked' : ''}`}>
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="메뉴 열기"
        >
          ☰
        </button>
        <Logo className="mobile-logo" size="60" />
        {userProfileButton && (
          <div className="header-profile">{userProfileButton}</div>
        )}
      </header>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
    </div>
  );
}
