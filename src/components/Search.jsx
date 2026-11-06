import React, { useState } from 'react';
import './Search.css';
import { Icon } from './Icon';
import SearchFilter from './SearchFilter';
import { HighlightText } from '../utils/searchUtils';
import { noAutofillProps } from '../utils/noAutofill';

export function Search({ onSearch, onClear, isSearching, startDate, endDate, onStartDateChange, onEndDateChange, onFilterClear }) {
  const [query, setQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      onSearch(trimmedQuery);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  // 패널이 닫혀 있어도 기간이 지정돼 있으면 칩을 활성 색으로 둬서 필터가 걸려 있음을 알린다
  const filterActive = showFilter || !!(startDate || endDate);

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-form" autoComplete="off">
        <button type="submit" className="search-icon-button" aria-label="검색">
          <Icon name="search" size={17} />
        </button>
        <input
          type="search"
          autoComplete="off"
          {...noAutofillProps}
          placeholder="일기 검색"
          aria-label="일기 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        {isSearching && (
          <button type="button" onClick={handleClear} className="search-icon-button" aria-label="검색 지우기">
            <Icon name="close" size={17} />
          </button>
        )}
      </form>
      <div className="search-chips">
        <button
          type="button"
          className={`search-chip${filterActive ? ' active' : ''}`}
          aria-expanded={showFilter}
          onClick={() => setShowFilter(!showFilter)}
        >
          기간 지정
        </button>
      </div>
      {showFilter && (
        <SearchFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onClear={onFilterClear}
        />
      )}
    </div>
  );
}

export function SearchResultList({ results, onResultClick, query, totalResults, currentPage, onPageChange, itemsPerPage }) {
  if (!results || results.length === 0) {
    return <div className="search-no-results">검색 결과가 없습니다.</div>;
  }

  const totalPages = Math.ceil(totalResults / itemsPerPage);

  const getJosa = (keyword) => {
    if (!keyword) return '으로';
    const lastChar = keyword.charCodeAt(keyword.length - 1);
    // 한글 유니코드 범위: 0xAC00 (가) ~ 0xD7A3 (힣)
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '으로';
    return (lastChar - 0xAC00) % 28 === 0 ? '로' : '으로';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${month}월 ${day}일`;
  };

  return (
    <div className="search-results-container">
      <h3 className="search-results-title">
        '{query}'{getJosa(query)} 검색한 결과입니다. ({totalResults}개)
      </h3>
      <ul className="search-results-list">
        {results.map(entry => (
          <li key={entry.date} className="search-result-item" onClick={() => onResultClick(entry.date)}>
            <div className="result-date">{formatDate(entry.date)}</div>
            <div className="result-title">
              <HighlightText text={entry.title} keyword={query} />
            </div>
            <p className="result-snippet">
              <HighlightText text={entry.content ? entry.content.substring(0, 80) + '...' : '내용 없음'} keyword={query} />
            </p>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="이전 페이지"
          >
            &lt;
          </button>
          <span className="pagination-info">{currentPage} / {totalPages}</span>
          <button
            className="pagination-button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="다음 페이지"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}