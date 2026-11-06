import React, { useMemo } from 'react';
import { Icon } from './Icon';
import './TagCloud.css';

// 처음에 보이는 개수. 넘치면 +N 칩으로 접는다 (시안의 칩 규칙)
const COLLAPSED_COUNT = 12;
// 많이 쓴 순서대로 칩 글자를 키운다 (시안)
const RANK_FONT_SIZES = [14.5, 13.5, 13, 12.5];

export function TagCloud({ entries, onTagSelect, activeTag }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

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

  const hiddenCount = tags.length - COLLAPSED_COUNT;
  // 선택한 태그가 접힌 쪽에 있어도 보이게 함께 그린다
  const visibleTags = isExpanded
    ? tags
    : tags.filter(({ tag }, index) => index < COLLAPSED_COUNT || tag === activeTag);

  return (
    <div className="tag-cloud-container">
      <div className="tag-cloud-header">
        <Icon name="tag" size={15} />
        <h3 className="tag-cloud-title">태그</h3>
      </div>

      <div className="tag-list">
        {visibleTags.map(({ tag, count }, index) => (
          <button
            key={tag}
            type="button"
            className={`tag-chip${activeTag === tag ? ' active' : ''}`}
            style={{ fontSize: RANK_FONT_SIZES[index] ?? 12 }}
            aria-pressed={activeTag === tag}
            // 선택한 칩을 다시 누르면 필터를 해제한다
            onClick={() => onTagSelect(activeTag === tag ? null : tag)}
            title={`${count}개의 일기`}
          >
            <span className="tag-chip-name">#{tag}</span>
            <span className="tag-chip-count">{count}</span>
          </button>
        ))}
        {hiddenCount > 0 && (
          <button type="button" className="tag-chip tag-chip-more" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? '접기' : `+${hiddenCount}`}
          </button>
        )}
      </div>
    </div>
  );
}
