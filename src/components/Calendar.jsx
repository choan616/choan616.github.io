import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getEntriesDateList } from '../db/adapter';
import 'react-day-picker/style.css';
import './Calendar.css';

export function Calendar({ selectedDate, onSelect }) {
  const [datesWithEntries, setDatesWithEntries] = useState([]);

  // 일기가 있는 날짜 목록 로드
  useEffect(() => {
    loadEntriesDates();
  }, [selectedDate]); // selectedDate가 변경되면 재로드

  async function loadEntriesDates() {
    try {
      const dates = await getEntriesDateList();
      // 문자열 날짜를 Date 객체로 변환
      const parsedDates = dates.map(dateStr => parseISO(dateStr));
      setDatesWithEntries(parsedDates);
    } catch (error) {
      console.error('날짜 목록 로드 실패:', error);
    }
  }

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
