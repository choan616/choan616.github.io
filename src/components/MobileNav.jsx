// 모바일 하단 탭(일기·사진·통계·더보기)과 오른쪽 아래 쓰기 버튼(FAB)
import React from 'react';
import { Icon } from './Icon';
import './MobileNav.css';

const TABS = [
  { key: 'diary', label: '일기', icon: 'diary' },
  { key: 'photos', label: '사진', icon: 'photo' },
  { key: 'stats', label: '통계', icon: 'stats' },
  { key: 'more', label: '더보기', icon: 'menu' },
];

export function MobileNav({ active, onSelect, showWrite, onWrite }) {
  return (
    <>
      {showWrite && (
        <button type="button" className="mobile-fab" aria-label="오늘 일기 쓰기" onClick={onWrite}>
          <Icon name="pencil" size={24} />
        </button>
      )}
      <nav className="mobile-nav" aria-label="주 메뉴">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            className={`mobile-nav-tab${active === key ? ' active' : ''}`}
            aria-current={active === key ? 'page' : undefined}
            onClick={() => onSelect(key)}
          >
            <Icon name={icon} size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
