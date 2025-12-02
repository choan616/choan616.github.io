import { db } from './db';
import { compressImage, createThumbnail } from '../utils/imageCompression';

/**
 * 일기 데이터 저장소
 * IndexedDB CRUD 작업과 Blob 이미지 관리
 */

/**
 * 일기 엔트리와 이미지를 함께 저장
 * @param {Object} entry - 일기 데이터
 * @param {File[]} imageFiles - 이미지 파일 배열
 * @param {Function} onProgress - 진행률 콜백
 * @returns {Promise<void>}
 */
export async function saveEntryWithImages(entry, imageFiles = [], onProgress = null) {
  const { date, title, content, tags } = entry;

  // 1. 이미지 전처리 (압축 및 썸네일 생성) - 트랜잭션 외부에서 수행
  const processedImages = [];
  if (imageFiles && imageFiles.length > 0) {
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];

      // 이미지 압축
      const blob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        format: 'webp'
      });

      // 썸네일 생성
      const thumbnail = await createThumbnail(blob, 200);

      processedImages.push({
        entryDate: date,
        blob,
        thumbnail,
        createdAt: new Date()
      });

      if (onProgress) {
        onProgress(i + 1, imageFiles.length);
      }
    }
  }

  // 2. 데이터 저장 - 트랜잭션으로 원자적 저장
  await db.transaction('rw', db.entries, db.images, async () => {
    // 텍스트 데이터 저장
    await db.entries.put({
      date,
      title: title || '',
      content: content || '',
      tags: tags || []
    });

    // 처리된 이미지 저장
    if (processedImages.length > 0) {
      for (const imgData of processedImages) {
        await db.images.add(imgData);
      }
    }
  });
}

/**
 * 일기와 이미지를 함께 조회
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} entry와 images를 포함한 객체
 */
export async function getEntryWithImages(date) {
  const entry = await db.entries.get(date);

  if (!entry) {
    return null;
  }

  // 해당 날짜의 모든 이미지 조회
  const imageRecords = await db.images
    .where('entryDate')
    .equals(date)
    .toArray();

  // Blob을 Object URL로 변환
  const images = imageRecords.map(record => ({
    id: record.id,
    url: URL.createObjectURL(record.blob),
    thumbnailUrl: URL.createObjectURL(record.thumbnail),
    createdAt: record.createdAt
  }));

  return {
    ...entry,
    images
  };
}

/**
 * 모든 일기 엔트리 조회 (이미지는 제외)
 * @returns {Promise<Array>}
 */
export async function getAllEntries() {
  return await db.entries.toArray();
}

/**
 * 일기가 있는 날짜 목록 조회
 * @returns {Promise<string[]>}
 */
export async function getEntriesDateList() {
  const entries = await db.entries.toArray();
  return entries.map(e => e.date);
}

/**
 * 일기 삭제 (연결된 이미지도 함께 삭제)
 * @param {string} date - 날짜
 * @returns {Promise<void>}
 */
export async function deleteEntry(date) {
  await db.transaction('rw', db.entries, db.images, async () => {
    // 일기 삭제
    await db.entries.delete(date);

    // 연결된 이미지 모두 삭제
    await db.images
      .where('entryDate')
      .equals(date)
      .delete();
  });
}

/**
 * 특정 이미지만 삭제
 * @param {number} imageId - 이미지 ID
 * @returns {Promise<void>}
 */
export async function deleteImage(imageId) {
  await db.images.delete(imageId);
}

/**
 * 오래된 이미지 자동 정리
 * @param {number} olderThanDays - 이 일수보다 오래된 이미지 삭제
 * @returns {Promise<number>} 삭제된 이미지 수
 */
export async function deleteOldImages(olderThanDays = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const oldImages = await db.images
    .where('createdAt')
    .below(cutoffDate)
    .toArray();

  const count = oldImages.length;

  await db.images
    .where('createdAt')
    .below(cutoffDate)
    .delete();

  return count;
}

/**
 * 고아 이미지 삭제 (엔트리가 없는 이미지)
 * @returns {Promise<number>} 삭제된 이미지 수
 */
export async function deleteOrphanedImages() {
  const allImages = await db.images.toArray();
  const allEntries = await db.entries.toArray();
  const entryDates = new Set(allEntries.map(e => e.date));

  const orphanedIds = allImages
    .filter(img => !entryDates.has(img.entryDate))
    .map(img => img.id);

  if (orphanedIds.length > 0) {
    await db.images.bulkDelete(orphanedIds);
  }

  return orphanedIds.length;
}

/**
 * 전체 데이터를 백업용 JSON으로 내보내기
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
  const entries = await db.entries.toArray();
  const images = await db.images.toArray();

  // Blob을 Base64로 변환
  const imagesWithBase64 = await Promise.all(
    images.map(async (img) => {
      try {
        return {
          id: img.id,
          entryDate: img.entryDate,
          createdAt: img.createdAt,
          blob: await blobToBase64(img.blob),
          thumbnail: await blobToBase64(img.thumbnail)
        };
      } catch (error) {
        console.error(`이미지 변환 실패 (ID: ${img.id}):`, error);
        return {
          id: img.id,
          entryDate: img.entryDate,
          createdAt: img.createdAt,
          blob: null, // 변환 실패 시 null 처리
          thumbnail: null,
          error: 'Conversion failed'
        };
      }
    })
  );

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    entries,
    images: imagesWithBase64
  };
}

/**
 * 백업 데이터를 가져오기
 * @param {Object} data - exportAllData()로 생성된 데이터
 * @param {boolean} merge - true면 기존 데이터와 병합, false면 덮어쓰기
 * @returns {Promise<void>}
 */
export async function importData(data, merge = false) {
  if (!merge) {
    // 기존 데이터 모두 삭제
    await db.entries.clear();
    await db.images.clear();
  }

  await db.transaction('rw', db.entries, db.images, async () => {
    // 엔트리 복원
    for (const entry of data.entries) {
      await db.entries.put(entry);
    }

    // 이미지 복원 (Base64를 Blob으로 변환)
    for (const img of data.images) {
      await db.images.put({
        entryDate: img.entryDate,
        createdAt: new Date(img.createdAt),
        blob: base64ToBlob(img.blob),
        thumbnail: base64ToBlob(img.thumbnail)
      });
    }
  });
}

/**
 * 스토리지 사용량 추정
 * @returns {Promise<Object>} { entries, images, total } (bytes)
 */
export async function getStorageUsage() {
  const entries = await db.entries.toArray();
  const images = await db.images.toArray();

  // 텍스트 데이터 크기 추정
  const entriesSize = JSON.stringify(entries).length;

  // 이미지 Blob 크기 계산
  let imagesSize = 0;
  for (const img of images) {
    imagesSize += img.blob.size + img.thumbnail.size;
  }

  return {
    entries: entriesSize,
    images: imagesSize,
    total: entriesSize + imagesSize
  };
}

// 헬퍼 함수
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}
