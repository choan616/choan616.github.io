import React, { useMemo } from 'react';
import { Icon } from './Icon';
import './TagCloud.css';

export function TagCloud({ entries, onTagSelect, activeTag }) {
  const [isExpanded, setIsExpanded] = React.useState(false); // Default collapsed on all views? Or check screen width? Let's default collapsed for tidiness.

  const tags = useMemo(() => {
    const tagCount = new Map();
    entries.forEach(entry => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tagCount.set(trimmedTag, (tagCount.get(trimmedTag) || 0) + 1);
          }
        });
      }
    });
    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([tag, count]) => ({ tag, count }));
  }, [entries]);

  if (tags.length === 0) {
    return null; // Don't render if there are no tags
  }

  return (
    <div className="tag-cloud-container">
      <div
        className="tag-cloud-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="tag-cloud-title">
          태그 클라우드
          <span className="tag-count-badge">{tags.length}</span>
        </h3>
        <button className={`tag-toggle-btn ${isExpanded ? 'expanded' : ''}`}>
          <Icon name="chevron-down" />
        </button>
      </div>

      <div className={`tag-list ${isExpanded ? 'expanded' : ''}`}>
        <button
          className={`tag-item ${!activeTag ? 'active' : ''}`}
          onClick={() => onTagSelect(null)}
        >
          모든 태그
        </button>
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            className={`tag-item ${activeTag === tag ? 'active' : ''}`}
            onClick={() => onTagSelect(tag)}
            title={`${count}개의 일기`}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}