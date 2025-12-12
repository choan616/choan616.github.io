import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-day-picker/style.css';
import './Calendar.css';
import { db } from '../db/db';

export function Calendar({ selectedDate, onSelect, userId }) {
  const datesWithEntries = useLiveQuery(
    async () => {
      if (!userId) return [];
      try {
        const entries = await db.entries.where('userId').equals(userId).toArray();
        const parsedDates = entries.map(entry => parseISO(entry.date));
        return parsedDates;
      } catch (error) {
        console.error('날짜 목록 로드 실패 (live):', error);
        return [];
      }
    },
    [userId], // userId가 변경되면 쿼리를 다시 실행합니다.
    [] // 초기값은 빈 배열입니다.
  );

  const handleDayClick = (day) => {
    if (day) {
      const dateStr = format(day, 'yyyy-MM-dd');
      onSelect(dateStr);
    }
  };

  const currentSelectedDate = selectedDate ? parseISO(selectedDate) : new Date();

  return (
    <div className="calendar-wrapper">
      <DayPicker
        mode="single"
        selected={currentSelectedDate}
        onSelect={handleDayClick}
        locale={ko}
        modifiers={{
          hasEntry: datesWithEntries
        }}
        modifiersClassNames={{
          hasEntry: 'day-has-entry'
        }}
        showOutsideDays
        fixedWeeks
      />
    </div>
  );
}
