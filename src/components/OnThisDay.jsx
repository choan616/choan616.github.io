import React, { useMemo } from 'react';
import { format } from 'date-fns';
import './OnThisDay.css';
import { Icon } from './Icon';

// compact: 메인 화면용 한 줄 카드. 과거 기록이 없으면 아무것도 그리지 않는다
const OnThisDay = ({ entries, onSelectEntry, compact = false }) => {

  const pastEntries = useMemo(() => {
    if (!entries) return [];

    const today = new Date();
    const monthDay = format(today, 'MM-dd');
    const currentYear = today.getFullYear();

    const matchingEntries = entries.filter(entry =>
      entry.date.endsWith(monthDay) && !entry.date.startsWith(currentYear.toString())
    );

    return matchingEntries.sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  if (compact) {
    if (pastEntries.length === 0) return null;
    const currentYear = new Date().getFullYear();

    return (
      <div className="on-this-day-cards">
        {pastEntries.map(entry => {
          const [year, month, day] = entry.date.split('-').map(Number);
          const yearsAgo = currentYear - year;
          const text = (entry.content || entry.title || '').replace(/\s+/g, ' ').trim();
          return (
            <div key={entry.date} className="on-this-day-card">
              <span className="on-this-day-card-icon"><Icon name="clock" size={19} /></span>
              <div className="on-this-day-card-body">
                <div className="on-this-day-card-label">
                  {yearsAgo === 1 ? '작년 오늘' : `${yearsAgo}년 전 오늘`} · {year}년 {month}월 {day}일
                </div>
                <div className="on-this-day-card-text">{text || '내용이 없습니다.'}</div>
              </div>
              <button type="button" className="on-this-day-card-open" onClick={() => onSelectEntry(entry.date)}>열기</button>
            </div>
          );
        })}
      </div>
    );
  }

  if (pastEntries.length === 0) {
    // 과거 기록이 없어도 위젯의 형태는 유지하여 일관성을 줍니다.
    return (
      <div className="stats-widget">
        <h3>과거의 오늘</h3>
        <p className="on-this-day-empty">과거의 오늘 작성된 일기가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="stats-widget">
      <h3>과거의 오늘</h3>
      <div className="on-this-day-list">
        {pastEntries.map(entry => (
          <div key={entry.date} className="on-this-day-item" onClick={() => onSelectEntry(entry.date)}>
            <span className="on-this-day-date">{entry.date}</span>
            <span className="on-this-day-title">{entry.title || '제목 없음'}</span>
            <p className="on-this-day-snippet">{entry.content ? entry.content.substring(0, 70) + '...' : '내용이 없습니다.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnThisDay;
