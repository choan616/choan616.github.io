import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { addMonths, format, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import './Calendar.css';
import { getAvailableYearsAndMonths } from '../db/adapter';
import { Icon } from './Icon';

export function Calendar({ selectedDate, onSelect, entryDates = [], currentUser }) {
  // Ensure selectedDate is a Date object, even if a string is passed.
  const internalSelectedDate = selectedDate ? new Date(selectedDate) : null;

  const currentUserId = currentUser?.userId;
  // Initialize displayMonth with a valid Date object.
  const [displayMonth, setDisplayMonth] = useState(internalSelectedDate || new Date());
  const [availableYears, setAvailableYears] = useState([]);
  // 달력 제목을 누르면 연·월 바로가기가 펼쳐진다 (시안은 제목만 보인다)
  const [jumpOpen, setJumpOpen] = useState(false);

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

  // 일기가 없는 해를 보고 있어도 셀렉트가 비지 않게 올해와 보고 있는 해를 함께 넣는다
  const years = [...new Set([...availableYears, new Date().getFullYear(), displayMonth.getFullYear()])]
    .sort((a, b) => b - a);

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
    future: { after: new Date() },
  };

  const modifiersClassNames = {
    hasEntry: 'day-has-entry',
    future: 'day-future',
  };

  return (
    <div className="calendar-container">
      <div className="calendar-caption">
        <button type="button" className="calendar-arrow" aria-label="이전 달" onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}>
          <Icon name="chevron-left" size={17} />
        </button>
        <button
          type="button"
          className="calendar-title"
          aria-expanded={jumpOpen}
          title="연·월 바로가기"
          onClick={() => setJumpOpen(!jumpOpen)}
        >
          {format(displayMonth, 'yyyy년 M월')}
        </button>
        <button type="button" className="calendar-arrow" aria-label="다음 달" onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}>
          <Icon name="chevron-right" size={17} />
        </button>
      </div>
      {jumpOpen && (
        <div className="calendar-navigation">
          <select aria-label="연도" value={displayMonth.getFullYear()} onChange={handleYearChange}>
            {years.map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
          <select aria-label="월" value={displayMonth.getMonth()} onChange={handleMonthChange}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{i + 1}월</option>
            ))}
          </select>
        </div>
      )}
      <DayPicker
        mode="single"
        selected={internalSelectedDate}
        onSelect={handleDaySelect} // onSelect is the correct prop for DayPicker
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        locale={ko}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        hideNavigation
      />
      <div className="calendar-legend">
        <span className="calendar-legend-item"><span className="calendar-legend-dot" />작성한 날</span>
        <span className="calendar-legend-item"><span className="calendar-legend-today" />오늘</span>
        <button type="button" className="btn-today" onClick={handleGoToToday}>오늘로 이동</button>
      </div>
    </div>
  );
}
