import React, { useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import './ContributionHeatmap.css';

const getTooltipText = (count, date) => {
  if (count === 0) {
    return `No entries on ${date}`;
  }
  return `${count} ${count > 1 ? 'entries' : 'entry'} on ${date}`;
};

const getColorClass = (count) => {
  if (count === 0) return 'color-empty';
  if (count === 1) return 'color-scale-1';
  if (count <= 3) return 'color-scale-2';
  if (count <= 5) return 'color-scale-3';
  return 'color-scale-4';
};

export function ContributionHeatmap({ entries }) {
  const data = useMemo(() => {
    const today = startOfDay(new Date());
    const dateCounts = new Map();

    // Initialize all days with 0 count
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      dateCounts.set(date, 0);
    }

    // Populate with actual entry counts
    entries.forEach(entry => {
      const entryDate = format(startOfDay(new Date(entry.date)), 'yyyy-MM-dd');
      if (dateCounts.has(entryDate)) {
        dateCounts.set(entryDate, dateCounts.get(entryDate) + 1);
      }
    });

    // Create an array of days to render
    const days = [];
    for (let i = 0; i < 365; i++) {
      const date = subDays(today, i);
      const dateString = format(date, 'yyyy-MM-dd');
      days.unshift({
        date: dateString,
        count: dateCounts.get(dateString) || 0,
      });
    }

    return days;
  }, [entries]);

  const firstDay = new Date(data[0].date).getDay();

  return (
    <div className="heatmap-container">
      <div className="heatmap-grid">
        {/* Add blank cells to align the start of the week */}
        {Array.from({ length: firstDay }).map((_, index) => (
          <div key={`blank-${index}`} className="heatmap-cell blank" />
        ))}
        {data.map(day => (
          <div
            key={day.date}
            className={`heatmap-cell ${getColorClass(day.count)}`}
            title={getTooltipText(day.count, day.date)}
          />
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="heatmap-cell color-empty" />
        <div className="heatmap-cell color-scale-1" />
        <div className="heatmap-cell color-scale-2" />
        <div className="heatmap-cell color-scale-3" />
        <div className="heatmap-cell color-scale-4" />
        <span>More</span>
      </div>
    </div>
  );
}
