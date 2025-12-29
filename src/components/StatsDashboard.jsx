import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { format, subMonths, startOfMonth } from 'date-fns';
import './StatsDashboard.css';

// 확장된 통계 컴포넌트들을 가져옵니다.
import OnThisDay from './OnThisDay';
import { WordCloud } from './WordCloud';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export function StatsDashboard({ entries, onSelectEntry }) {
  // Use state to store colors, and useEffect to update them on theme change.
  // Initialize state with a function to read computed styles on mount.
  // The component will be re-mounted when the theme changes via the `key` prop.
  const [chartColors] = useState(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      accentPrimaryRgb: style.getPropertyValue('--accent-primary-rgb').trim(),
      accentSecondaryRgb: style.getPropertyValue('--accent-secondary-rgb').trim(),
      chartColor1Rgb: style.getPropertyValue('--chart-color-1-rgb').trim(),
      chartColor2Rgb: style.getPropertyValue('--chart-color-2-rgb').trim(),
      chartColor3Rgb: style.getPropertyValue('--chart-color-3-rgb').trim(),
      chartColor4Rgb: style.getPropertyValue('--chart-color-4-rgb').trim(),
      textSecondary: style.getPropertyValue('--text-secondary').trim(),
      borderColor: style.getPropertyValue('--border-color').trim(),
    };
  });

  const { monthlyData, tagData } = useMemo(() => {
    // Monthly Stats
    const monthlyCounts = new Map();
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      return format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM');
    }).reverse();

    last12Months.forEach(month => monthlyCounts.set(month, 0));

    entries.forEach(entry => {
      const month = entry.date.substring(0, 7);
      if (monthlyCounts.has(month)) {
        monthlyCounts.set(month, monthlyCounts.get(month) + 1);
      }
    });

    const monthlyChartData = {
      labels: last12Months,
      datasets: [{
        label: '월별 일기 수',
        data: last12Months.map(month => monthlyCounts.get(month)),
        backgroundColor: `rgba(${chartColors.accentPrimaryRgb}, 0.6)`,
        borderColor: `rgba(${chartColors.accentPrimaryRgb}, 1)`,
        borderWidth: 1,
      }],
    };

    // Tag Stats
    const tagCounts = new Map();
    entries.forEach(entry => {
      entry.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const tagChartData = {
      labels: sortedTags.map(([tag]) => `#${tag}`),
      datasets: [{
        label: '태그 사용 빈도',
        data: sortedTags.map(([, count]) => count),
        backgroundColor: [
          `rgba(${chartColors.accentPrimaryRgb}, 0.8)`, `rgba(${chartColors.accentPrimaryRgb}, 0.6)`,
          `rgba(${chartColors.accentSecondaryRgb}, 0.8)`, `rgba(${chartColors.accentSecondaryRgb}, 0.6)`,
          `rgba(${chartColors.chartColor1Rgb}, 0.7)`, `rgba(${chartColors.chartColor2Rgb}, 0.7)`,
          `rgba(${chartColors.chartColor3Rgb}, 0.7)`, `rgba(${chartColors.chartColor4Rgb}, 0.7)`,
          `rgba(${chartColors.accentPrimaryRgb}, 0.4)`, `rgba(${chartColors.accentSecondaryRgb}, 0.4)`,
        ],
        borderColor: chartColors.borderColor,
        borderWidth: 1,
      }],
    };

    return { monthlyData: monthlyChartData, tagData: tagChartData };
  }, [entries, chartColors]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: chartColors.textSecondary }
      },
      title: { display: false },
    },
    scales: {
      y: { ticks: { color: chartColors.textSecondary, stepSize: 1 } },
      x: { ticks: { color: chartColors.textSecondary } },
    },
  };

  return (
    <div className="stats-dashboard">
      {/* --- 확장된 통계 위젯 --- */}
      <div className="stats-card">
        {/* '과거의 오늘' 클릭 시 해당 일기로 이동하기 위해 onSelectEntry를 전달합니다. */}
        <OnThisDay entries={entries} onSelectEntry={onSelectEntry} />
      </div>
      <div className="stats-card">
        {/* WordCloud 컴포넌트는 자체 제목이 없으므로 여기서 추가해줍니다. */}
        <h3>주요 키워드</h3>
        <WordCloud entries={entries} chartColors={chartColors} />
      </div>

      {/* --- 기존 통계 차트 --- */}
      <div className="stats-card">
        <h3>최근 12개월 작성 현황</h3>
        <div className="chart-container"><Bar options={chartOptions} data={monthlyData} /></div>
      </div>
      <div className="stats-card">
        <h3>태그 사용 빈도 (Top 10)</h3>
        <div className="chart-container"><Doughnut options={{ ...chartOptions, scales: {} }} data={tagData} /></div>
      </div>
    </div>
  );
}