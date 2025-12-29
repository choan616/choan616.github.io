import React, { useMemo } from 'react';
import './WordCloud.css';

// Basic list of Korean and English stop words.
const KOREAN_STOP_WORDS = new Set([
  '이', '가', '은', '는', '을', '를', '과', '와', '의', '에', '에서', '에게', '께', '한테', '더러',
  '하고', '로', '으로', '고', '면', '며', '서', '나', '다', '만', '도', '까지', '부터', '라도',
  '조차', '마저', '이나', '나마', '든지', '든', '던', '것', '수', '좀', '그', '저', '이것',
  '그것', '저것', '내', '네', '우리', '너희', '그들', '있다', '없다', '같다', '아니다', '위해',
  '대한', '때문', '그리고', '그래서', '그러나', '그런데', '하지만', '및', '또는', '등', '등등',
  '한', '두', '세', '그렇게', '이렇게', '저렇게', '매우', '아주', '정말', '너무', '더', '덜',
  '것이다', '것을', '것이', '했다', '하였다', '하는', '나는', '내가', '너는', '네가'
]);

const ENGLISH_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'o', 'of', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same',
  'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'you', 'your', 'yours',
  'yourself', 'yourselves'
]);

const processTextForWordCloud = (text) => {
  const words = text
    .toLowerCase()
    .replace(/[.,!?'"“”—’‘[\](){}]/g, ' ') // Remove punctuation
    .match(/[\p{L}\p{N}_]+/gu) || []; // Match words (including Unicode letters)

  const wordCounts = new Map();
  words.forEach(word => {
    if (word.length > 1 && !KOREAN_STOP_WORDS.has(word) && !ENGLISH_STOP_WORDS.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  });

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15); // Get top 15 words
};

const getWordStyle = (count, minCount, maxCount, colors) => {
  const minFontSize = 24;
  const maxFontSize = 60;
  
  const weight = (count - minCount) / (maxCount - minCount);
  const fontSize = minFontSize + (weight * (maxFontSize - minFontSize));
  
  let color;
  if (weight > 0.8) color = `rgba(${colors.accentPrimaryRgb}, 1)`;
  else if (weight > 0.5) color = `rgba(${colors.accentPrimaryRgb}, 0.8)`;
  else if (weight > 0.2) color = `rgba(${colors.accentSecondaryRgb}, 0.9)`;
  else color = `rgba(${colors.accentSecondaryRgb}, 0.7)`;

  return { fontSize: `${fontSize}px`, color };
};

export function WordCloud({ entries, chartColors }) {
  const wordData = useMemo(() => {
    const allContent = entries.map(entry => entry.content).join(' ');
    return processTextForWordCloud(allContent);
  }, [entries]);

  // Shuffle for a more "cloud-like" random appearance
  // Use a deterministic sort (alphabetical) to avoid "Impure function" error and ensure stability
  const shuffledData = useMemo(() => {
    return [...wordData].sort((a, b) => a[0].localeCompare(b[0]));
  }, [wordData]);

  if (wordData.length === 0) {
    return <div className="wordcloud-container"><p>분석할 단어가 충분하지 않습니다.</p></div>;
  }

  const minCount = wordData[wordData.length - 1][1];
  const maxCount = wordData[0][1];

  return (
    <div className="wordcloud-container">
      <div className="wordcloud">
        {shuffledData.map(([word, count]) => (
          <span
            key={word}
            className="wordcloud-word"
            style={getWordStyle(count, minCount, maxCount, chartColors)}
            title={`${count}회`}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
