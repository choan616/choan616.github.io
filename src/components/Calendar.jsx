import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { ko } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import './Calendar.css';
import { getAvailableYearsAndMonths } from '../db/adapter';

export function Calendar({ selectedDate, onSelect, entryDates = [], currentUser }) {
  // Ensure selectedDate is a Date object, even if a string is passed.
  const internalSelectedDate = selectedDate ? new Date(selectedDate) : null;

  const currentUserId = currentUser?.userId;
  // Initialize displayMonth with a valid Date object.
  const [displayMonth, setDisplayMonth] = useState(internalSelectedDate || new Date());
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    // 컴포넌트 마운트 시 일기가 있는 연도 목록을 가져옵니다.
    async function fetchAvailableYears() {
      if (currentUserId) {
        const yearMonthMap = await getAvailableYearsAndMonths(currentUserId);
        const years = Object.keys(yearMonthMap).map(Number).sort((a, b) => b - a);
        setAvailableYears(years);
      }
    }
    fetchAvailableYears();
  }, [currentUserId]);

  const handleGoToToday = () => {
    const today = new Date();
    if (typeof onSelect === 'function') onSelect(today);
    setDisplayMonth(today);
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    const newDate = new Date(year, displayMonth.getMonth(), 1);
    setDisplayMonth(newDate);
  };

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value, 10);
    const newDate = new Date(displayMonth.getFullYear(), month, 1);
    setDisplayMonth(newDate);
  };

  // DayPicker의 onSelect 핸들러
  // react-day-picker v8은 여러 인자를 전달할 수 있으므로, 첫 번째 인자인 Date 객체만 사용합니다.
  // 같은 날짜를 다시 클릭하면 DayPicker가 선택 해제하려고 하므로 date가 undefined가 될 수 있습니다.
  // 이 경우 현재 선택된 날짜를 다시 전달하여 컨텐츠가 표시되도록 합니다.
  const handleDaySelect = (date) => {
    if (typeof onSelect === 'function') {
      // date가 undefined인 경우 (같은 날짜 재클릭) 현재 선택된 날짜를 사용
      const dateToSelect = date instanceof Date ? date : internalSelectedDate;
      if (dateToSelect instanceof Date) {
        onSelect(dateToSelect);
      }
    }
  };

  // react-day-picker에 전달할 modifiers
  const modifiers = {
    hasEntry: entryDates.map(dateStr => new Date(dateStr)),
  };

  const modifiersClassNames = {
    hasEntry: 'day-has-entry'
  };

  return (
    <div className="calendar-container">
      <div className="calendar-navigation">
        <select value={displayMonth.getFullYear()} onChange={handleYearChange}>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}년</option>
          ))}
        </select>
        <select value={displayMonth.getMonth()} onChange={handleMonthChange}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>{i + 1}월</option>
          ))}
        </select>
        <button onClick={handleGoToToday} className="btn-today">오늘</button>
      </div>
      <DayPicker
        mode="single"
        selected={internalSelectedDate}
        onSelect={handleDaySelect} // onSelect is the correct prop for DayPicker
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        locale={ko}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        showOutsideDays
        fixedWeeks
      />
    </div>
  );
}
