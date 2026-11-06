import React, { useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import './StatsDashboard.css';

// 확장된 통계 컴포넌트들을 가져옵니다.
import OnThisDay from './OnThisDay';
import { WordCloud } from './WordCloud';
import { ContributionHeatmap } from './ContributionHeatmap';
import { calcLongestStreak } from '../utils/streak';

const PERIODS = [
  { key: 'year', label: '올해' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];

const MONTH_COUNT = 6;
const TAG_COUNT = 10;
// 막대 최대 높이(px). 값·월 라벨을 뺀 96px 칸 안에 들어간다 (시안)
const BAR_MAX_HEIGHT = 56;

// entry.date 는 'yyyy-MM-dd' 문자열이라 접두사로 기간을 비교한다. 전체는 빈 문자열이다
function periodPrefix(period) {
  if (period === 'all') return '';
  return format(new Date(), period === 'year' ? 'yyyy' : 'yyyy-MM');
}

export function StatsDashboard({ entries, onSelectEntry }) {
  const [period, setPeriod] = useState('year');
  // '과거의 오늘'은 지난 해 기록이 필요해 거르지 않고, 나머지 위젯만 선택한 기간으로 본다
  const periodEntries = useMemo(() => {
    const prefix = periodPrefix(period);
    return entries.filter(entry => entry.date.startsWith(prefix));
  }, [entries, period]);

  // 키워드 클라우드가 쓰는 색. 테마가 바뀌면 `key` 로 재마운트되어 다시 읽는다
  const [chartColors] = useState(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      accentPrimaryRgb: style.getPropertyValue('--accent-primary-rgb').trim(),
      accentSecondaryRgb: style.getPropertyValue('--accent-secondary-rgb').trim(),
    };
  });

  const { summary, months, tags } = useMemo(() => {
    const dates = periodEntries.map(entry => entry.date);
    const totalLength = periodEntries.reduce((sum, entry) => sum + (entry.content?.length || 0), 0);

    const monthlyCounts = new Map();
    dates.forEach(date => {
      const month = date.substring(0, 7);
      monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1);
    });
    // 최근 6개월 중 선택한 기간에 드는 달만 그린다. 기간 밖의 달을 0 으로 보이지 않게 한다
    const prefix = periodPrefix(period);
    const monthKeys = Array.from({ length: MONTH_COUNT }, (_, i) => format(subMonths(new Date(), MONTH_COUNT - 1 - i), 'yyyy-MM'))
      .filter(month => month.startsWith(prefix));
    const maxMonthly = Math.max(1, ...monthKeys.map(month => monthlyCounts.get(month) || 0));

    const tagCounts = new Map();
    periodEntries.forEach(entry => {
      entry.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, TAG_COUNT);

    return {
      summary: {
        days: new Set(dates).size,
        longest: calcLongestStreak(dates),
        average: dates.length ? Math.round(totalLength / dates.length) : 0,
      },
      months: monthKeys.map(month => {
        const value = monthlyCounts.get(month) || 0;
        return {
          month,
          value,
          label: `${Number(month.slice(5))}월`,
          height: value ? Math.max(4, Math.round((value / maxMonthly) * BAR_MAX_HEIGHT)) : 2,
        };
      }),
      tags: sortedTags.map(([name, count]) => ({ name, count, width: `${Math.round((count / sortedTags[0][1]) * 100)}%` })),
    };
  }, [periodEntries, period]);

  return (
    <div className="stats-dashboard">
      <div className="stats-period" role="group" aria-label="통계 기간">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={period === key ? 'active' : ''}
            aria-pressed={period === key}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="stats-summary">
        <div className="stats-tile">
          <div className="stats-tile-label">기록한 날</div>
          <div className="stats-tile-value">{summary.days.toLocaleString()}<span>일</span></div>
        </div>
        <div className="stats-tile">
          <div className="stats-tile-label">최장 연속</div>
          <div className="stats-tile-value">{summary.longest.toLocaleString()}<span>일</span></div>
        </div>
        <div className="stats-tile">
          <div className="stats-tile-label">평균 길이</div>
          <div className="stats-tile-value">{summary.average.toLocaleString()}<span>자</span></div>
        </div>
      </div>

      <div className="stats-card">
        <ContributionHeatmap entries={periodEntries} />
      </div>

      <div className="stats-card">
        <h3>월별 기록 일수</h3>
        <div className="stats-months">
          {months.map(({ month, value, label, height }, index) => (
            <div key={month} className="stats-month">
              <span className="stats-month-value">{value}</span>
              <span className={`stats-month-bar${index === months.length - 1 ? ' is-current' : ''}`} style={{ height }} />
              <span className="stats-month-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-card">
        <h3>자주 쓴 태그</h3>
        {tags.length > 0 ? (
          <div className="stats-tags">
            {tags.map(({ name, count, width }) => (
              <div key={name} className="stats-tag">
                <span className="stats-tag-name" title={`#${name}`}>#{name}</span>
                <span className="stats-tag-track"><span style={{ width }} /></span>
                <span className="stats-tag-count">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="stats-empty">이 기간에 쓴 태그가 없습니다.</p>
        )}
      </div>

      <div className="stats-card">
        {/* WordCloud 컴포넌트는 자체 제목이 없으므로 여기서 추가해줍니다. */}
        <h3>주요 키워드</h3>
        <WordCloud entries={periodEntries} chartColors={chartColors} />
      </div>

      {/* '과거의 오늘' 클릭 시 해당 일기로 이동하기 위해 onSelectEntry를 전달합니다. */}
      <div className="stats-card stats-card-wide">
        <OnThisDay entries={entries} onSelectEntry={onSelectEntry} />
      </div>
    </div>
  );
}