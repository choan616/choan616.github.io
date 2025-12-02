import React from 'react';
import './Layout.css';

export function Layout({ children, currentEntry, onBackupClick, isMobileSidebarOpen, setIsMobileSidebarOpen }) {
  const hasImages = currentEntry?.images && currentEntry.images.length > 0;

  const handleBackupClick = () => {
    setIsMobileSidebarOpen(false);
    if (onBackupClick) {
      onBackupClick();
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          {isMobileSidebarOpen ? '✕' : '☰'}
        </button>
        <h1>📖 일기장</h1>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="main-container">
        {/* Left Sidebar */}
        <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
          {children.sidebar}

          {/* Mobile Menu Actions */}
          <div className="mobile-menu-actions">
            <button
              className="menu-action-btn"
              onClick={handleBackupClick}
            >
              💾 백업 및 동기화
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="content-area">
          {/* Top Section - Image Carousel (conditional) */}
          {hasImages && (
            <section className="content-top">
              {children.carousel}
            </section>
          )}

          {/* Bottom Section - Entry Editor */}
          <section className={`content-bottom ${!hasImages ? 'full-height' : ''}`}>
            {children.editor}
          </section>
        </main>
      </div>
    </div>
  );
}
