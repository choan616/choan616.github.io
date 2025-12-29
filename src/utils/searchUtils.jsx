import React from 'react';

/**
 * 텍스트에서 검색어와 일치하는 부분을 하이라이트 처리하여 반환합니다.
 * @param {Object} props
 * @param {string} props.text - 전체 텍스트
 * @param {string} props.keyword - 검색어
 * @returns {JSX.Element}
 */
export const HighlightText = ({ text, keyword }) => {
  if (!keyword || !text) return <>{text}</>;

  // 특수문자 이스케이프 처리
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedKeyword})`, 'gi'));

  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={index} className="search-highlight">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};