import Dexie from 'dexie';

/**
 * IndexedDB 데이터베이스 설정
 * Dexie.js를 사용한 일기장 데이터베이스
 */
export const db = new Dexie('DiaryDB');

// 스키마 버전 1 (원본)
db.version(1).stores({
  // 일기 엔트리 (텍스트 데이터)
  entries: 'date, title, *tags',

  // 이미지 데이터 (Blob 저장)
  images: '++id, entryDate, createdAt'
});

// 스키마 버전 2 (중간 단계: PK 변경을 위한 임시 테이블)
db.version(2).stores({
  users: 'userId, email, createdAt',
  entries: null, // 기존 테이블 삭제
  entries_temp: '[userId+date], userId, date, title, *tags', // 새 PK를 가진 임시 테이블
  images: '++id, userId, entryDate, createdAt'
}).upgrade(async tx => {
  const DEFAULT_USER_ID = 'default-user';

  // 1. 기본 사용자 생성
  await tx.table('users').add({
    userId: DEFAULT_USER_ID,
    email: 'default@local',
    name: '기본 사용자',
    passwordHash: null,
    passwordSalt: null,
    createdAt: new Date()
  });

  // 2. 기존 entries 데이터를 entries_temp로 이동
  // 삭제된 테이블('entries')에서 데이터를 읽어와서 새 테이블('entries_temp')에 씀
  const oldEntries = await tx.table('entries').toArray();
  if (oldEntries.length > 0) {
    await tx.table('entries_temp').bulkAdd(oldEntries.map(entry => ({
      ...entry,
      userId: DEFAULT_USER_ID
    })));
  }

  // 3. images 테이블에 userId 추가 (이미지는 PK가 id이므로 modify 가능)
  await tx.table('images').toCollection().modify({
    userId: DEFAULT_USER_ID
  });

  console.log('Database migration to v2 (temp) completed.');
});

// 스키마 버전 3 (최종: 원래 테이블 이름으로 복구)
db.version(3).stores({
  entries_temp: null, // 임시 테이블 삭제
  entries: '[userId+date], userId, date, title, *tags' // 최종 테이블 생성
}).upgrade(async tx => {
  // entries_temp 데이터를 다시 entries로 이동
  const tempEntries = await tx.table('entries_temp').toArray();
  if (tempEntries.length > 0) {
    await tx.table('entries').bulkAdd(tempEntries);
  }

  console.log('Database migration to v3 (final) completed.');
});

// 스키마 버전 4 (변경 추적 및 백업 시간 추가)
db.version(4).stores({
  // users 테이블에 마지막 백업 시간 추가
  users: 'userId, email, createdAt, lastBackupAt',
  // entries 테이블에 생성/수정 시간 추가
  entries: '[userId+date], userId, date, title, *tags, createdAt, updatedAt'
}).upgrade(async tx => {
  const now = new Date().toISOString();

  // 기존 모든 entries에 createdAt, updatedAt 필드 추가
  await tx.table('entries').toCollection().modify(entry => {
    entry.createdAt = entry.createdAt || now;
    entry.updatedAt = entry.updatedAt || now;
  });

  // 기존 모든 users에 lastBackupAt 필드 추가
  await tx.table('users').toCollection().modify(user => {
    user.lastBackupAt = user.lastBackupAt || null;
  });
});

// 스키마 버전 5 (이미지 쿼리 성능 향상)
db.version(5).stores({
  // images 테이블에 userId와 entryDate를 합친 복합 인덱스 추가
  images: '++id, [userId+entryDate], userId, entryDate, createdAt'
});

// 스키마 버전 6 (blob, thumbnail 필드 타입 명시 - Base64 문자열 저장)
db.version(6).stores({
  // 저장할 모든 필드를 명시적으로 선언합니다.
  // 인덱싱이 필요한 필드: ++id, [userId+entryDate], userId, entryDate, createdAt
  // 데이터만 저장할 필드: blob, thumbnail, blobType, blobSize, thumbnailType, thumbnailSize
  images: '++id, [userId+entryDate], userId, entryDate, createdAt, blob, thumbnail, blobType, blobSize, thumbnailType, thumbnailSize'
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
