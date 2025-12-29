import React, { useState } from 'react';
import './Search.css';
import SearchFilter from './SearchFilter';
import { HighlightText } from '../utils/searchUtils';

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

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="search"
          placeholder="일기 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button
          type="button"
          className={`search-filter-toggle ${showFilter ? 'active' : ''}`}
          onClick={() => setShowFilter(!showFilter)}
          title="날짜 필터"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>
        {isSearching ? (
          <button type="button" onClick={handleClear} className="search-button clear">
            ✕
          </button>
        ) : (
          <button type="submit" className="search-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
      </form>
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