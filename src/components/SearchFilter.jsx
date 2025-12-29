import React, { useState } from 'react';
import { format } from 'date-fns';
import './SearchFilter.css';

const DateInput = ({ value, onChange, ...props }) => {
    const [type, setType] = useState('text');
    
    // value가 유효한 경우에만 포맷팅, 아니면 빈 문자열
    const displayValue = value ? format(new Date(value), 'yyyy년 MM월 dd일') : '';

    return (
        <input
            {...props}
            type={type}
            value={type === 'date' ? value || '' : displayValue}
            onFocus={() => setType('date')}
            onBlur={() => setType('text')}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};

const SearchFilter = ({ startDate, endDate, onStartDateChange, onEndDateChange, onClear }) => {

  return (
    <div className="search-filter">
      <div className="search-filter-dates">
        <DateInput
          value={startDate}
          onChange={onStartDateChange}
          className="search-date-input"
          aria-label="검색 시작 날짜"
          placeholder="시작 날짜"
        />
        <span className="search-date-separator">~</span>
        <DateInput
          value={endDate}
          onChange={onEndDateChange}
          className="search-date-input"
          aria-label="검색 종료 날짜"
          placeholder="종료 날짜"
        />
      </div>
      {(startDate || endDate) && (
        <button onClick={onClear} className="search-filter-clear" aria-label="필터 초기화" title="필터 초기화">
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchFilter;