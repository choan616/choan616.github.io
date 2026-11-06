// 모바일 홈의 요약 카드 두 장(이번 달 기록 일수 / 연속 일수)
import React, { useMemo } from 'react';
import { calcStreak, countInMonth } from '../utils/streak';
import './HomeSummary.css';

export function HomeSummary({ entryDates }) {
  const { monthCount, streak } = useMemo(() => ({
    monthCount: countInMonth(entryDates),
    streak: calcStreak(entryDates),
  }), [entryDates]);

  return (
    <div className="home-summary">
      <div className="home-summary-card">
        <div className="home-summary-label">이번 달</div>
        <div className="home-summary-value">{monthCount}일 기록</div>
      </div>
      <div className="home-summary-card">
        <div className="home-summary-label">연속</div>
        <div className="home-summary-value">{streak}일</div>
      </div>
    </div>
  );
}
