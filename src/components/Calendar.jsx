import React from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-day-picker/style.css';
import './Calendar.css';

export function Calendar({ selectedDate, onSelect, entriesDateList = [] }) {
  // prop으로 받은 날짜 문자열 배열을 Date 객체 배열로 변환
  const datesWithEntries = entriesDateList.map(dateStr => parseISO(dateStr));

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
