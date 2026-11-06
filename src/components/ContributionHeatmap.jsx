import React, { useMemo } from 'react';
import { format, addDays, startOfDay, startOfWeek, subWeeks, isAfter } from 'date-fns';
import './ContributionHeatmap.css';

const WEEKS = 18;

// 일기는 날짜당 하나라 개수로는 0/1 만 나온다. 글자 수로 5단계를 나눈다 (D22)
const getLevel = (entry) => {
  if (!entry) return 0;
  const length = entry.content?.length || 0;
  if (length >= 1000) return 4;
  if (length >= 500) return 3;
  if (length >= 200) return 2;
  return 1;
};

const getTooltipText = (date, entry) => {
  const day = format(date, 'M월 d일');
  return entry ? `${day} · ${(entry.content?.length || 0).toLocaleString()}자` : `${day} · 기록 없음`;
};

export function ContributionHeatmap({ entries }) {
  const { today, cells } = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const entryByDate = new Map(entries.map(entry => [entry.date, entry]));
    // 열 = 주(일요일 시작), 행 = 요일. 마지막 열이 이번 주다
    const start = subWeeks(startOfWeek(todayStart), WEEKS - 1);

    const days = Array.from({ length: WEEKS * 7 }, (_, i) => {
      const date = addDays(start, i);
      // 이번 주의 아직 오지 않은 날은 빈 자리로 둔다
      if (isAfter(date, todayStart)) return { key: i, blank: true };
      const entry = entryByDate.get(format(date, 'yyyy-MM-dd'));
      return { key: i, level: getLevel(entry), title: getTooltipText(date, entry) };
    });

    return { today: todayStart, cells: days };
  }, [entries]);

  return (
    <div className="heatmap">
      <div className="heatmap-header">
        <span className="heatmap-title">최근 {WEEKS}주</span>
        <span className="heatmap-until">{format(today, 'M월 d일')}까지</span>
      </div>
      <div className="heatmap-grid" role="img" aria-label={`최근 ${WEEKS}주 기록 현황`}>
        {cells.map(cell => (
          cell.blank
            ? <span key={cell.key} className="heatmap-cell blank" />
            : <span key={cell.key} className={`heatmap-cell level-${cell.level}`} title={cell.title} />
        ))}
      </div>
      <div className="heatmap-legend">
        <span>적음</span>
        {[0, 1, 2, 3, 4].map(level => (
          <span key={level} className={`heatmap-cell legend level-${level}`} />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
