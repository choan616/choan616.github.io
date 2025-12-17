import React, { useState } from 'react';
import './Search.css';

export function Search({ onSearch, onClear, isSearching }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
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
    </div>
  );
}

export function SearchResultList({ results, onResultClick }) {
  if (results.length === 0) {
    return <div className="search-no-results">검색 결과가 없습니다.</div>;
  }

  return (
    <div className="search-results-container">
      <ul className="search-results-list">
        {results.map(entry => (
          <li key={entry.date} className="search-result-item" onClick={() => onResultClick(entry.date)}>
            <div className="result-date">{entry.date}</div>
            <div className="result-title">{entry.title || '제목 없음'}</div>
            <p className="result-snippet">
              {entry.content ? entry.content.substring(0, 80) + '...' : '내용 없음'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}