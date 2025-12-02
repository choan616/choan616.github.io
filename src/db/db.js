import Dexie from 'dexie';

/**
 * IndexedDB 데이터베이스 설정
 * Dexie.js를 사용한 일기장 데이터베이스
 */
export const db = new Dexie('DiaryDB');

// 스키마 정의
db.version(1).stores({
  // 일기 엔트리 (텍스트 데이터)
  entries: 'date, title, *tags',

  // 이미지 데이터 (Blob 저장)
  images: '++id, entryDate, createdAt'
});

/**
 * 일기 엔트리 타입
 * @typedef {Object} DiaryEntry
 * @property {string} date - 날짜 (YYYY-MM-DD, Primary Key)
 * @property {string} title - 제목
 * @property {string} content - 본문
 * @property {string[]} tags - 태그 배열
 */

/**
 * 이미지 데이터 타입
 * @typedef {Object} ImageData
 * @property {number} id - 자동 증가 ID
 * @property {string} entryDate - 연결된 일기 날짜
 * @property {Blob} blob - 이미지 Blob 데이터
 * @property {Blob} thumbnail - 썸네일 Blob
 * @property {Date} createdAt - 생성 일시
 */
