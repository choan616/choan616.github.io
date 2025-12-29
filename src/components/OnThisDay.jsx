import React, { useMemo } from 'react';
import { format } from 'date-fns';
import './OnThisDay.css';

const OnThisDay = ({ entries, onSelectEntry }) => {

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