import { db } from './db';
import { compressImage, createThumbnail, blobToBase64, base64ToBlob } from '../utils/imageCompression';
import JSZip from 'jszip';

/**
 * 일기 데이터 저장소
 * IndexedDB CRUD 작업과 Blob 이미지 관리
 */

// ==================== 사용자 관리 함수 ====================

/**
 * 새 사용자 생성
 * @param {Object} userData - { email, name, password }
 * @returns {Promise<string>} 생성된 userId
 */
export async function createUser(userData, googleData = null) {
  const { email, name, password } = userData;
  const { imageUrl } = googleData || {};

  // 이메일 중복 확인
  const existing = await db.users.where('email').equals(email).first();
  if (existing) {
    // 이미 사용자가 존재하면, Google 프로필 정보(이름, 이미지)를 업데이트합니다.
    const updateData = {};
    if (name && existing.name !== name) updateData.name = name;
    if (imageUrl && existing.imageUrl !== imageUrl) updateData.imageUrl = imageUrl;

    if (Object.keys(updateData).length > 0) {
      await db.users.update(existing.userId, updateData);
    }
    return existing.userId;
  }

  // 비밀번호 해싱
  const { generateSalt, hashPassword } = await import('../utils/auth');
  const salt = generateSalt();
  const passwordHash = password ? await hashPassword(password, salt) : null;

  // userId 생성 (타임스탬프 + 랜덤)
  const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await db.users.add({
    userId,
    email,
    name: name || email.split('@')[0],
    passwordHash,
    imageUrl: imageUrl || null,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
    pinHash: null,
    pinSalt: null,
    settings: {}, // 사용자별 설정값
    lastBackupAt: null
  });

  return userId;
}

/**
 * 사용자 인증
 * @param {string} userId - 사용자 ID
 * @param {string} password - 비밀번호
 * @returns {Promise<boolean>} 인증 성공 여부
 */
export async function authenticateUser(userId, password) {
  const user = await db.users.get(userId);

  if (!user) {
    return false;
  }

  // 비밀번호가 설정되지 않은 경우 (기본 사용자)
  if (!user.passwordHash) {
    return true;
  }

  // 비밀번호 검증
  const { verifyPassword } = await import('../utils/auth');
  return await verifyPassword(password, user.passwordHash, user.passwordSalt);
}

/**
 * 모든 사용자 목록 조회
 * @returns {Promise<Array>}
 */
export async function getAllUsers() {
  return await db.users.toArray();
}

/**
 * 사용자 정보 조회
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getUser(userId) {
  return await db.users.get(userId);
}

/**
 * 사용자 비밀번호 설정/변경
 * @param {string} userId
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function updateUserPassword(userId, newPassword) {
  const { generateSalt, hashPassword } = await import('../utils/auth');
  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);

  await db.users.update(userId, {
    passwordHash,
    passwordSalt: salt
  });
}

/**
 * 사용자 삭제 (모든 관련 데이터 함께 삭제)
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  await db.transaction('rw', db.users, db.entries, db.images, async () => {
    // 사용자의 모든 일기 삭제
    await db.entries.where('userId').equals(userId).delete();

    // 사용자의 모든 이미지 삭제
    await db.images.where('userId').equals(userId).delete();

    // 사용자 프로필 삭제
    await db.users.delete(userId);
  });
}

/**
 * 사용자 데이터 초기화 (일기 및 이미지)
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function resetUserData(userId) {
  await db.transaction('rw', db.entries, db.images, async () => {
    // 사용자의 모든 일기 삭제
    await db.entries.where('userId').equals(userId).delete();

    // 사용자의 모든 이미지 삭제
    await db.images.where('userId').equals(userId).delete();
  });
}

// ==================== 일기 관리 함수 (userId 추가) ====================

/**
 * 일기 엔트리와 이미지를 함께 저장
 * @param {string} userId - 사용자 ID
 * @param {Object} entry - 일기 데이터
 * @param {File[]} imageFiles - 이미지 파일 배열
 * @param {Function} onProgress - 진행률 콜백
 * @returns {Promise<void>}
 */
export async function saveEntryWithImages(userId, entry, imageFiles = [], onProgress = null) {
  const { date, title, content, tags, images: finalImages } = entry;

  // 1. 이미지 전처리 (압축 및 썸네일 생성) - 트랜잭션 외부에서 수행
  const processedImages = [];
  if (imageFiles && imageFiles.length > 0) {
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];

      try {
        // 이미지 압축
        const blob = await compressImage(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.7,
          format: 'jpeg'
        });
        console.log(`Image compression successful for file: ${file.name}, original size: ${file.size}, compressed size: ${blob.size}`);

        // 썸네일 생성
        const thumbnail = await createThumbnail(blob, 200);
        console.log(`Thumbnail creation successful for file: ${file.name}, size: ${thumbnail.size}`);

        processedImages.push({
          userId,
          entryDate: date,
          blob: await blobToBase64(blob, true), // 데이터 URL 형식으로 변환
          thumbnail: await blobToBase64(thumbnail, true), // 데이터 URL 형식으로 변환
          createdAt: new Date(),
          blobType: blob.type,
          blobSize: blob.size,
          thumbnailType: thumbnail.type,
          thumbnailSize: thumbnail.size
        });

        if (onProgress) {
          onProgress(i + 1, imageFiles.length);
        }
      } catch (imageProcessError) {
        console.error(`Error processing image ${file.name} for entry ${date}:`, imageProcessError);
        throw new Error(`이미지 처리 중 오류가 발생했습니다: ${imageProcessError.message || imageProcessError}`);
      }
    }
  }

  // 2. 데이터 저장 - 트랜잭션으로 원자적 저장
  await db.transaction('rw', db.entries, db.images, async () => {
    // 2a. 삭제할 이미지 식별 및 삭제
    const existingImages = await db.images.where({ userId, entryDate: date }).toArray();
    const existingImageIds = existingImages.map(img => img.id);
    const finalImageIds = new Set(finalImages.map(img => img.id));

    const imageIdsToDelete = existingImageIds.filter(id => !finalImageIds.has(id));

    if (imageIdsToDelete.length > 0) {
      console.log('삭제할 고아 이미지:', imageIdsToDelete);
      await db.images.bulkDelete(imageIdsToDelete);
    }

    // 텍스트 데이터 저장
    const now = new Date().toISOString();
    const existingEntry = await db.entries.get([userId, date]);
    await db.entries.put({
      userId,
      date,
      title: title || '',
      content: content || '',
      tags: tags || [],
      createdAt: existingEntry?.createdAt || now, // 기존 생성 시간 유지
      updatedAt: now // 수정 시간 갱신
      // deletedAt은 생성/수정 시 null 또는 undefined 상태여야 함
    }, { userId, date }); // put의 두 번째 인자로 key를 전달하여 명확성 확보

    // 처리된 이미지 저장
    if (processedImages.length > 0) {
      for (const imgData of processedImages) {
        // 신규 이미지는 항상 add로 추가합니다. id는 자동 증가되므로 imgData에 id가 없어야 합니다.
        // 실패 시, Dexie 트랜잭션이 전체 작업을 롤백하여 데이터 일관성을 보장합니다.
        await db.images.add(imgData).catch(error => {
          console.error(`Failed to add new image for entry ${imgData.entryDate}. Transaction will be aborted.`, {
            error,
            imageData: { ...imgData, blob: '...', thumbnail: '...' } // 큰 데이터는 로그에서 제외
          });
          throw error; // 에러를 다시 던져 트랜잭션을 중단시킵니다.
        });
      }
    }
  });
}

/**
 * 일기와 이미지를 함께 조회
 * @param {string} userId - 사용자 ID
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @returns {Promise<Object>} entry와 images를 포함한 객체
 */
export async function getEntryWithImages(userId, date) {
  const entry = await db.entries.where('[userId+date]').equals([userId, date]).first();

  // 삭제된 항목은 null 반환
  if (!entry || entry.deletedAt) {
    return null;
  }

  // 해당 날짜의 삭제되지 않은 이미지만 조회
  const imageRecords = await db.images
    .where({ userId, entryDate: date })
    .and(img => !img.deletedAt)
    .toArray();

  const images = imageRecords.map(record => {
    const isFromMemory = record.blob instanceof Blob;
    const blobObject = isFromMemory ? record.blob : base64ToBlob(record.blob);
    const thumbnailUrlObject = isFromMemory ? record.thumbnail : base64ToBlob(record.thumbnail);

    console.log(`getEntryWithImages: Processing image ID ${record.id}`);
    console.log(`  record.blob (raw):`, typeof record.blob, record.blob ? (typeof record.blob === 'string' ? record.blob.substring(0, 50) + '...' : `Blob { size: ${record.blob.size}, type: '${record.blob.type}' }`) : record.blob);
    console.log(`  blobObject from logic:`, blobObject?.type, blobObject?.size);
    console.log(`  record.thumbnail (raw):`, typeof record.thumbnail, record.thumbnail ? (typeof record.thumbnail === 'string' ? record.thumbnail.substring(0, 50) + '...' : `Blob { size: ${record.thumbnail.size}, type: '${record.thumbnail.type}' }`) : record.thumbnail);
    console.log(`  thumbnailUrlObject from logic:`, thumbnailUrlObject?.type, thumbnailUrlObject?.size);

    return {
      id: record.id,
      url: URL.createObjectURL(blobObject),
      thumbnailUrl: URL.createObjectURL(thumbnailUrlObject),
      createdAt: record.createdAt,
      source: isFromMemory ? 'memory' : 'db' // 데이터 출처(캐시/DB) 추가
    };
  });

  return {
    ...entry,
    images
  };
}

// ==================== PIN 관련 함수 ====================

/**
 * 사용자 PIN 설정 (4자리 숫자, 해시+솔트 저장)
 * @param {string} userId
 * @param {string} pin - 평문 PIN (숫자 4자리)
 */
export async function setPin(userId, pin) {
  const { generateSalt, hashPassword } = await import('../utils/auth');
  const salt = generateSalt();
  const pinHash = await hashPassword(pin, salt);
  await db.users.update(userId, {
    pinHash,
    pinSalt: salt
  });
}

/**
 * 사용자 PIN 삭제
 * @param {string} userId
 */
export async function clearPin(userId) {
  await db.users.update(userId, {
    pinHash: null,
    pinSalt: null
  });
}

/**
 * 사용자 PIN 검증
 * @param {string} userId
 * @param {string} pin
 * @returns {Promise<boolean>}
 */
export async function verifyPin(userId, pin) {
  // validate userId
  if (!userId) return false;
  try {
    const user = await db.users.get(userId);
    if (!user || !user.pinHash || !user.pinSalt) return false;
    const { verifyPassword } = await import('../utils/auth');
    return await verifyPassword(pin, user.pinHash, user.pinSalt);
  } catch (err) {
    console.error('verifyPin error:', err);
    return false;
  }
}

/**
 * 사용자의 모든 일기 엔트리 조회 (이미지는 제외)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Array>}
 */
export async function getAllEntries(userId) {
  // 삭제되지 않은 일기만 조회
  return await db.entries.where({ userId }).and(e => !e.deletedAt).toArray();
}

/**
 * 사용자의 일기가 있는 날짜 목록 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise<string[]>}
 */
export async function getEntriesDateList(userId) {
  // 삭제되지 않은 일기만 조회
  const entries = await db.entries.where({ userId }).and(e => !e.deletedAt).toArray();
  return entries.map(e => e.date);
}

/**
 * 사용자의 일기가 있는 모든 연도와 월 목록을 조회합니다.
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} { '2023': [1, 2, 12], '2024': [3, 5] } 형태의 객체
 */
export async function getAvailableYearsAndMonths(userId) {
  const entries = await db.entries.where({ userId }).and(e => !e.deletedAt).toArray();
  const yearMonthMap = {};

  entries.forEach(entry => {
    const [year, month] = entry.date.split('-');
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (!yearMonthMap[yearNum]) {
      yearMonthMap[yearNum] = new Set();
    }
    yearMonthMap[yearNum].add(monthNum);
  });

  // Set을 정렬된 배열로 변환
  Object.keys(yearMonthMap).forEach(year => {
    yearMonthMap[year] = Array.from(yearMonthMap[year]).sort((a, b) => a - b);
  });

  return yearMonthMap;
}

/**
 * 제목, 내용, 태그에서 키워드로 일기를 검색합니다.
 * @param {string} userId - 사용자 ID
 * @param {string} query - 검색어
 * @returns {Promise<Array>} 검색된 일기 객체 배열
 */
export async function searchEntries(userId, query) {
  if (!query || !userId) {
    return [];
  }
  const lowerCaseQuery = query.toLowerCase();

  // 제목, 내용, 태그에서 대소문자 구분 없이 검색
  const results = await db.entries
    .where('userId').equals(userId)
    .and(entry =>
      !entry.deletedAt && (
        (entry.title && entry.title.toLowerCase().includes(lowerCaseQuery)) ||
        (entry.content && entry.content.toLowerCase().includes(lowerCaseQuery)) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
      )
    )
    .reverse() // 최신 일기부터 보여주기 위해 역순 정렬
    .toArray();

  return results;
}

/**
 * 일기 삭제 (연결된 이미지도 함께 삭제)
 * @param {string} userId - 사용자 ID
 * @param {string} date - 날짜
 * @returns {Promise<void>}
 */
export async function deleteEntry(userId, date) {
  const now = new Date().toISOString();
  await db.transaction('rw', db.entries, db.images, async () => {
    // 일기를 soft delete (deletedAt 필드 업데이트)
    const entryCount = await db.entries.where({ userId, date }).modify({
      deletedAt: now,
      updatedAt: now
    });

    console.log(`[deleteEntry] Deleted ${entryCount} entries for ${date}`);

    // 연결된 이미지 모두 soft delete
    const imageCount = await db.images.where({ userId, entryDate: date }).modify({
      deletedAt: now,
      updatedAt: now
    });

    console.log(`[deleteEntry] Deleted ${imageCount} images for ${date}`);
  });
}

/**
 * 특정 이미지만 삭제
 * @param {number} imageId - 이미지 ID
 * @returns {Promise<void>}
 */
export async function deleteImage(imageId) {
  // 이미지를 soft delete
  await db.images.update(imageId, {
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

/**
 * 사용자의 오래된 이미지 자동 정리
 * @param {string} userId - 사용자 ID
 * @param {number} olderThanDays - 이 일수보다 오래된 이미지 삭제
 * @returns {Promise<number>} 삭제된 이미지 수
 */
export async function deleteOldImages(userId, olderThanDays = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const oldImages = await db.images
    .where({ userId })
    .and(img => img.createdAt < cutoffDate)
    .toArray();

  const count = oldImages.length;

  // 실제 삭제 (Hard Delete)
  await db.images
    .where({ userId })
    .and(img => img.createdAt < cutoffDate)
    .delete();

  return count;
}

/**
 * 사용자의 고아 이미지 삭제 (엔트리가 없는 이미지)
 * @param {string} userId - 사용자 ID
 * @returns {Promise<number>} 삭제된 이미지 수
 */
export async function deleteOrphanedImages(userId) {
  const allImages = await db.images.where({ userId }).toArray();
  // 삭제되지 않은 엔트리만 고려
  const allEntries = await db.entries.where({ userId }).and(e => !e.deletedAt).toArray();
  const entryDates = new Set(allEntries.map(e => e.date));

  const orphanedIds = allImages
    .filter(img => !entryDates.has(img.entryDate))
    .map(img => img.id);
  // 실제 삭제 (Hard Delete)
  if (orphanedIds.length > 0) {
    await db.images.bulkDelete(orphanedIds);
  }

  return orphanedIds.length;
}

/**
 * 마지막 백업 이후 변경사항이 있는지 확인
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasUnbackedUpChanges(userId) {
  const user = await db.users.get(userId);
  if (!user || !user.lastBackupAt) {
    return true; // 백업 기록이 없으면 항상 변경사항이 있는 것으로 간주
  }

  const lastBackupTimestamp = new Date(user.lastBackupAt).getTime();

  // 마지막 백업 이후 수정된 일기 확인
  const updatedEntry = await db.entries.where('userId').equals(userId)
    .and(entry => new Date(entry.updatedAt).getTime() > lastBackupTimestamp)
    .first();

  // 변경된 일기가 있으면 true 반환
  return !!updatedEntry;
}

/**
 * 사용자의 전체 데이터를 백업용 JSON으로 내보내기
 * @param {string} userId - 사용자 ID
 * @param {object} [options] - 내보내기 옵션
 * @param {boolean} [options.includeImages=true] - 이미지 포함 여부
 * @param {boolean} [options.thumbnailsOnly=false] - 썸네일만 포함할지 여부
 * @returns {Promise<Object>}
 */
export async function exportUserData(userId, options = {}) {
  const {
    includeImages = true,
    thumbnailsOnly = false
  } = options;

  const user = await db.users.get(userId);
  // 삭제되지 않은 데이터만 내보내기
  const entries = await db.entries.where({ userId }).and(e => !e.deletedAt).toArray();
  let imagesWithBase64 = [];

  if (includeImages) {
    // 삭제되지 않은 이미지만 내보내기
    const images = await db.images.where({ userId }).and(img => !img.deletedAt).toArray();

    // Blob을 Base64로 변환
    imagesWithBase64 = await Promise.all(
      images.map(async (img) => {
        try {
          let blobBase64 = null;
          let thumbnailBase64 = null;

          // Helper to safely convert blob or string to base64
          const safeToBase64 = async (data) => {
            if (!data) return null;
            if (data instanceof Blob) {
              return await blobToBase64(data, true); // true param might not be standard in blobToBase64 yet, check impl. 
              // Looking at imgCompression.js, blobToBase64 takes (blob). It returns data URL.
            }
            return data; // Assume string is already safe (or will be checked later)
          };

          if (!thumbnailsOnly) {
            blobBase64 = await safeToBase64(img.blob);
          }
          thumbnailBase64 = await safeToBase64(img.thumbnail);

          return {
            id: img.id,
            userId: img.userId,
            entryDate: img.entryDate,
            createdAt: img.createdAt,
            blob: blobBase64,
            thumbnail: thumbnailBase64
          };
        } catch (error) {
          console.error(`이미지 변환 실패 (ID: ${img.id}):`, error);
          return {
            id: img.id,
            userId: img.userId,
            entryDate: img.entryDate,
            createdAt: img.createdAt,
            blob: null,
            thumbnail: null,
            error: 'Conversion failed'
          };
        }
      })
    );
  }

  return {
    version: 2,
    exportDate: new Date().toISOString(),
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      pinHash: user.pinHash || null,
      pinSalt: user.pinSalt || null,
      settings: user.settings || {}
      // 비밀번호 해시는 백업에 포함하지 않음 (보안)
    },
    entries,
    images: imagesWithBase64
  };
}

/**
 * 마지막 백업 시간 업데이트
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function updateLastBackupTime(userId) {
  const now = new Date().toISOString();
  await db.users.update(userId, { lastBackupAt: now });
}

/**
 * 사용자의 전체 데이터를 ZIP 아카이브로 내보내기
 * @param {string} userId - 사용자 ID
 * @param {object} [options] - 내보내기 옵션
 * @param {boolean} [options.includeImages=true] - 이미지 포함 여부
 * @param {boolean} [options.thumbnailsOnly=false] - 썸네일만 포함할지 여부
 * @returns {Promise<Blob>} ZIP 파일 Blob
 */
export async function exportUserDataAsZip(userId, options = {}) {
  const { includeImages = true, thumbnailsOnly = false } = options;
  const zip = new JSZip();

  const user = await db.users.get(userId);

  if (!user) {
    throw new Error(`백업할 사용자를 찾을 수 없습니다: ${userId}`);
  }

  // 모든 엔트리 내보내기 (삭제된 것도 포함하여 Tombstone 전파)
  const entries = await db.entries.where({ userId }).toArray();

  const dataJson = {
    version: 3, // ZIP 아카이브 방식 버전
    exportDate: new Date().toISOString(),
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      pinHash: user.pinHash || null,
      pinSalt: user.pinSalt || null,
      settings: user.settings || {}
    },
    entries: [],
  };

  const imageFolder = zip.folder('images');

  for (const entry of entries) {
    // 삭제된 엔트리의 경우 이미지는 내보내지 않음 (메타데이터만 전송)
    if (entry.deletedAt) {
      dataJson.entries.push({
        ...entry,
        images: [] // 이미지 참조 없음
      });
      continue;
    }

    // 삭제되지 않은 이미지만 내보내기
    const entryImages = await db.images.where({ userId, entryDate: entry.date })
      .and(img => !img.deletedAt)
      .toArray();
    const imageReferences = [];

    if (includeImages && entryImages.length > 0) {
      console.log(`Found ${entryImages.length} images for entry ${entry.date}`);
      for (const img of entryImages) {
        const imageFileName = `img_${img.id}.jpeg`;
        const thumbnailFileName = `thumb_${img.id}.jpeg`;

        try {
          // ZIP에 이미지 파일 추가
          if (!thumbnailsOnly && img.blob) {
            let base64Data = '';

            if (img.blob instanceof Blob) {
              // Blob인 경우 Base64로 변환
              const dataUrl = await blobToBase64(img.blob);
              base64Data = dataUrl.split(',')[1];
              console.log(`Converted full image Blob to Base64 for ZIP: ${imageFileName}`);
            } else if (typeof img.blob === 'string') {
              // 이미 Base64 문자열인 경우 (Data URL 형식 체크)
              if (img.blob.includes(',')) {
                base64Data = img.blob.split(',')[1];
              } else {
                base64Data = img.blob; // prefix가 없는 순수 base64로 가정
              }
            }

            if (base64Data) {
              // Base64 데이터를 디코딩하여 바이너리 파일로 저장 (ZIP 옵션 base64: true 사용)
              imageFolder.file(imageFileName, base64Data, { base64: true });
            } else {
              console.warn(`Skipping full image ${imageFileName}: Invalid blob data type`, typeof img.blob);
            }
          }

          if (img.thumbnail) {
            let base64Data = '';

            if (img.thumbnail instanceof Blob) {
              const dataUrl = await blobToBase64(img.thumbnail);
              base64Data = dataUrl.split(',')[1];
              console.log(`Converted thumbnail Blob to Base64 for ZIP: ${thumbnailFileName}`);
            } else if (typeof img.thumbnail === 'string') {
              if (img.thumbnail.includes(',')) {
                base64Data = img.thumbnail.split(',')[1];
              } else {
                base64Data = img.thumbnail;
              }
            }

            if (base64Data) {
              imageFolder.file(thumbnailFileName, base64Data, { base64: true });
            } else {
              console.warn(`Skipping thumbnail ${thumbnailFileName}: Invalid thumbnail data type`, typeof img.thumbnail);
            }
          }

          // JSON에는 파일명 참조만 추가
          imageReferences.push({
            id: img.id,
            createdAt: img.createdAt,
            imageFile: thumbnailsOnly ? null : imageFileName,
            thumbnailFile: thumbnailFileName,
          });

        } catch (err) {
          console.error(`Failed to process image ${img.id} for ZIP export:`, err);
          // 실패한 이미지는 참조에서 제외하거나 에러 메시지 포함? 일단 스킵.
        }
      }
    } else if (includeImages && entryImages.length === 0) {
      console.log(`No images found for entry ${entry.date}, skipping image inclusion.`);
    }
    // entry 데이터에 이미지 참조 배열 추가 (images 필드를 덮어씁니다)
    const processedEntry = {
      ...entry,
      title: String(entry.title || ''),
      content: String(entry.content || ''),
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      images: imageReferences,
    };
    dataJson.entries.push(processedEntry);
  }

  // 최종 JSON 데이터를 ZIP에 추가
  zip.file('data.json', JSON.stringify(dataJson, null, 2));

  // ZIP Blob 생성
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * 백업 데이터를 가져오기 (ZIP 또는 JSON 형식)
 * @param {string} userId - 복원할 사용자 ID
 * @param {ArrayBuffer | Object} data - ZIP 파일의 ArrayBuffer 또는 v2 JSON 객체
 * @param {boolean} merge - true면 기존 데이터와 병합, false면 덮어쓰기
 * @returns {Promise<void>}
 */
async function _internal_importUserData(userId, data, merge = false) {
  let importData;
  let zip = null;

  // 데이터가 ArrayBuffer인 경우, ZIP 파일로 간주
  if (data instanceof ArrayBuffer) {
    try {
      zip = await JSZip.loadAsync(data);
      const dataJsonFile = zip.file('data.json');
      if (!dataJsonFile) {
        throw new Error("'data.json' not found in the zip archive.");
      }
      const dataJsonContent = await dataJsonFile.async('string');
      importData = JSON.parse(dataJsonContent);
    } catch (error) {
      console.error('Failed to process zip file:', error);
      throw new Error('유효하지 않은 ZIP 파일 형식입니다.');
    }
  } else {
    // 기존 JSON 객체 형식
    importData = data;
  }

  // 데이터 유효성 검사
  if (!importData || (!importData.entries && !importData.data)) {
    console.warn('importUserData: Invalid data structure', importData);
    throw new Error('유효하지 않은 데이터 형식입니다.');
  }

  // 구버전(v1) 데이터 구조 호환성
  if (importData.data) {
    importData.entries = importData.data.entries;
    importData.images = importData.data.images;
  }

  // ===== CRITICAL: 트랜잭션 밖에서 이미지를 Base64로 변환 =====
  // Dexie 트랜잭션 내에서 FileReader 사용 시 PrematureCommitError 발생
  const preparedEntries = [];

  for (const entry of importData.entries) {
    const { images, ...entryToSave } = entry; // images는 참조 배열
    const preparedImages = [];

    if (images && images.length > 0 && importData.version === 3 && zip) {
      console.log(`[IMPORT] Processing ${images.length} images for entry ${entry.date}`);

      for (const imgRef of images) {
        const imageFile = imgRef.imageFile ? zip.file(`images/${imgRef.imageFile}`) : null;
        const thumbFile = imgRef.thumbnailFile ? zip.file(`images/${imgRef.thumbnailFile}`) : null;

        if (imageFile || thumbFile) {
          let imageBlob = null;
          let imageBase64 = null;

          if (imageFile) {
            imageBlob = await imageFile.async('blob');
            imageBase64 = await blobToBase64(imageBlob, true); // 트랜잭션 밖에서 변환
            console.log(`[IMPORT] Converted full image for ID ${imgRef.id}: ${imageBlob.size} bytes`);
          } else {
            console.log(`[IMPORT] Image file for ID ${imgRef.id} not found in ZIP.`);
          }

          let thumbBlob = null;
          let thumbBase64 = null;

          if (thumbFile) {
            thumbBlob = await thumbFile.async('blob');
            thumbBase64 = await blobToBase64(thumbBlob, true); // 트랜잭션 밖에서 변환
            console.log(`[IMPORT] Converted thumbnail for ID ${imgRef.id}: ${thumbBlob.size} bytes`);
          } else {
            console.log(`[IMPORT] Thumbnail file for ID ${imgRef.id} not found in ZIP.`);
          }

          // Only add if at least a thumbnail exists
          if (thumbBase64) {
            preparedImages.push({
              id: imgRef.id,
              userId,
              entryDate: entry.date,
              createdAt: new Date(imgRef.createdAt),
              blob: imageBase64,
              thumbnail: thumbBase64
            });
          } else {
            console.warn(`[IMPORT] Skipping image (ID: ${imgRef.id}) for entry ${entry.date} - no valid thumbnail`);
          }
        } else {
          console.warn(`[IMPORT WARNING] Skipping image (ID: ${imgRef.id}) for entry ${entry.date} - files not found in ZIP`);
        }
      }
    }

    preparedEntries.push({
      entryData: {
        ...entryToSave,
        userId,
        deletedAt: entry.deletedAt || null // deletedAt 필드 처리
      },
      images: preparedImages
    });
  }

  // ===== 트랜잭션: IndexedDB 작업만 수행 =====
  await db.transaction('rw', db.entries, db.images, db.users, async () => {
    if (!merge) {
      await db.entries.where('userId').equals(userId).delete();
      await db.images.where('userId').equals(userId).delete();
    }

    // 1. 사용자 설정 복원
    if (importData.user && importData.user.settings) {
      await db.users.update(userId, { settings: importData.user.settings });
    }

    // 2. 엔트리 및 이미지 저장 (이미 Base64로 변환된 상태)
    for (const prepared of preparedEntries) {
      // 병합 로직: deletedAt이 있으면 삭제된 상태로, 아니면 일반 put
      if (prepared.entryData.deletedAt) {
        await db.entries.put(prepared.entryData);
      } else {
        await db.entries.put({ ...prepared.entryData, deletedAt: null });
      }

      for (const imagePayload of prepared.images) {
        try { // 이미지도 deletedAt을 처리해야 하지만, export에서 이미 걸러졌으므로 일단 put
          await db.images.put(imagePayload);
          console.log(`[IMPORT] Saved image (ID: ${imagePayload.id}) for entry ${imagePayload.entryDate}`);
        } catch (imagePutError) {
          console.error(`[IMPORT ERROR] Failed to save image (ID: ${imagePayload.id}) for entry ${imagePayload.entryDate}`, {
            error: imagePutError,
          });
        }
      }
    }

    // v2 (JSON/Base64) 형식 이미지 처리
    if (importData.images && importData.version !== 3) {
      for (const img of importData.images) {
        if (img.id && typeof img.blob === 'string' && img.blob.length > 0 && typeof img.thumbnail === 'string' && img.thumbnail.length > 0) {
          try {
            await db.images.put({
              id: img.id,
              userId: userId,
              entryDate: img.entryDate,
              createdAt: new Date(img.createdAt),
              deletedAt: img.deletedAt || null, // soft delete 필드
              blob: img.blob, // blob과 thumbnail은 이미 base64 문자열
              thumbnail: img.thumbnail
            });
          } catch (imagePutError) {
            console.error(`[IMPORT ERROR] Failed to save v2 image (ID: ${img.id})`, {
              error: imagePutError,
            });
          }
        } else {
          console.warn(`[IMPORT] Skipping invalid v2 image data. Image ID: ${img.id}`);
        }
      }
    }
  });

  console.log(`[IMPORT] Import completed for user ${userId}`);
}

/**
 * 사용자별 데이터를 임포트합니다 (BackupPanel.jsx에서 호출되는 진입점).
 * 데이터의 userId를 현재 사용자로 재할당한 후, 내부 임포트 함수를 호출합니다.
 *
 * @param {string} userId - 데이터를 복원할 현재 사용자 ID
 * @param {ArrayBuffer | Object} data - 임포트할 데이터 (ZIP ArrayBuffer 또는 파싱된 객체)
 * @param {boolean} merge - true면 기존 데이터와 병합, false면 덮어쓰기
 * @returns {Promise<void>}
 */
export async function importUserData(userId, data, merge = false) {
  // ZIP 파일의 경우, 내부 함수가 파싱하므로 여기서는 처리하지 않습니다.
  // 파싱된 JSON 객체(v2 형식)의 경우에만 userId를 재할당합니다.
  if (!(data instanceof ArrayBuffer) && data) {
    if (data.entries && Array.isArray(data.entries)) {
      data.entries.forEach(entry => (entry.userId = userId));
    }
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach(image => (image.userId = userId));
    }
    if (data.user) {
      data.user.userId = userId;
    }
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach(user => (user.userId = userId));
    }
  }

  // 내부 임포트 함수를 호출하여 실제 데이터베이스 작업을 수행합니다.
  // ZIP 파일의 경우, 내부 함수에서 파싱 후 userId가 올바르게 설정됩니다.
  return await _internal_importUserData(userId, data, merge);
}

/**
 * 여러 개의 일기 데이터를 데이터베이스에 병합합니다.
 * 날짜가 중복되면 기존 일기를 덮어씁니다.
 * @param {Array<Object>} entries - 저장할 일기 객체 배열
 * @returns {Promise<number>} 추가/수정된 일기 개수
 */
export async function bulkAddEntries(entries) {
  if (!entries || entries.length === 0) {
    return 0;
  }

  try {
    await db.entries.bulkPut(entries);
    return entries.length;
  } catch (error) {
    console.error('일괄 추가 실패:', error);
    throw new Error('데이터베이스 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 전체 데이터 내보내기 (모든 사용자)
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
  const users = await db.users.toArray();
  const entries = await db.entries.toArray();
  const images = await db.images.toArray();

  // Blob을 Base64로 변환
  const imagesWithBase64 = await Promise.all(
    images.map(async (img) => {
      try {
        return {
          id: img.id,
          userId: img.userId,
          entryDate: img.entryDate,
          createdAt: img.createdAt,
          blob: img.blob instanceof Blob ? await blobToBase64(img.blob) : img.blob,
          thumbnail: img.thumbnail instanceof Blob ? await blobToBase64(img.thumbnail) : img.thumbnail
        };
      } catch (error) {
        console.error(`이미지 변환 실패 (ID: ${img.id}):`, error);
        return {
          id: img.id,
          userId: img.userId,
          entryDate: img.entryDate,
          createdAt: img.createdAt,
          blob: null,
          thumbnail: null,
          error: 'Conversion failed'
        };
      }
    })
  );

  return {
    version: 2,
    exportDate: new Date().toISOString(),
    users: users.map(u => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      pinHash: u.pinHash || null,
      pinSalt: u.pinSalt || null
    })),
    entries,
    images: imagesWithBase64
  };
}

/**
 * 전체 데이터 가져오기
 * @param {Object} data - exportAllData()로 생성된 데이터
 * @param {boolean} merge - true면 기존 데이터와 병합, false면 덮어쓰기
 * @returns {Promise<void>}
 */
export async function importData(data, merge = false) {
  if (!data || !data.entries) {
    console.warn('importData: 유효하지 않은 데이터 구조', data);
    return;
  }

  if (!merge) {
    // 기존 데이터 모두 삭제
    await db.users.clear();
    await db.entries.clear();
    await db.images.clear();
  }

  // 사용자 복원 (트랜잭션 외부에서 먼저 처리)
  let defaultUserId = null;
  if (data.user) {
    await db.users.put({
      ...data.user,
      passwordHash: null,
      passwordSalt: null
    });
    defaultUserId = data.user.userId;
  }

  if (data.users && Array.isArray(data.users)) {
    for (const user of data.users) {
      await db.users.put({
        ...user,
        passwordHash: null,
        passwordSalt: null
      });
      if (!defaultUserId) {
        defaultUserId = user.userId;
      }
    }
  }

  if (!defaultUserId) {
    const restoredUsers = await db.users.toArray();
    defaultUserId = restoredUsers.length > 0 ? restoredUsers[0].userId : null;
  }

  if (!defaultUserId) {
    console.error('importData: 복원할 사용자 ID를 찾을 수 없음');
    return;
  }

  // 엔트리 및 이미지 복원 (트랜잭션)
  await db.transaction('rw', db.entries, db.images, async () => {
    // 2. 엔트리 복원
    console.log(`엔트리 복원 시작: ${data.entries.length}개`, defaultUserId);
    for (const entry of data.entries) {
      try {
        const entryToSave = {
          ...entry,
          userId: entry.userId || defaultUserId
        };

        if (!entryToSave.userId || !entryToSave.date) {
          console.warn('엔트리 스킵 (유효하지 않음):', entryToSave);
          continue;
        }

        await db.entries.put(entryToSave);
      } catch (err) {
        console.error('엔트리 저장 오류:', err, entry);
      }
    }
    console.log('엔트리 복원 완료');

    // 3. 이미지 복원 (안전한 'put' 사용)
    if (data.images && data.images.length > 0) {
      console.log(`이미지 복원 시작: ${data.images.length}개`);
      for (const img of data.images) {
        try {
          // Use put() for safe add/update. This requires the image object to have an ID.
          if (img.id && img.blob && img.thumbnail) {
            await db.images.put({
              id: img.id,
              userId: img.userId || defaultUserId,
              entryDate: img.entryDate,
              createdAt: new Date(img.createdAt),
              blob: img.blob,
              thumbnail: img.thumbnail
            });
          } else {
            console.warn('이미지 스킵 (id, blob 또는 thumbnail 없음):', img);
          }
        } catch (err) {
          console.error('이미지 저장 오류:', err, img);
        }
      }
      console.log('이미지 복원 완료');
    }
  });
}

/**
 * 사용자별 스토리지 사용량 추정
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} { entries, images, total } (bytes)
 */
export async function getStorageUsage(userId) {
  const entries = await db.entries.where('userId').equals(userId).toArray();
  const images = await db.images.where('userId').equals(userId).toArray();

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

/**
 * 로컬 데이터의 요약 정보를 가져옵니다 (일기 수, 이미지 수).
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} { entryCount, imageCount }
 */
export async function getLocalDataSummary(userId, includeHash = true) {
  if (!userId) {
    return { entryCount: 0, imageCount: 0, contentHash: null };
  }
  // 삭제되지 않은 항목만 카운트합니다.
  const entryCount = await db.entries.where({ userId }).and(e => !e.deletedAt).count();
  const imageCount = await db.images.where({ userId }).and(img => !img.deletedAt).count();

  let contentHash = null;
  if (includeHash) {
    try {
      const zipBlob = await exportUserDataAsZip(userId);
      const buffer = await zipBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('로컬 데이터 해시 생성 실패:', error);
    }
  }

  return { entryCount, imageCount, contentHash };
}




/**
 * 마지막 동기화 이후 변경사항이 있는지 확인
 * @param {number} timestamp
 * @returns {Promise<boolean>}
 */
export async function hasChangesSince(timestamp) {
  if (!timestamp) {
    // 마지막 동기화 시간이 없으면 변경 사항이 있는 것으로 간주합니다.
    return true;
  }

  // 주어진 타임스탬프 이후에 업데이트된 첫 번째 항목을 찾습니다.
  const updatedEntry = await db.entries
    .where('updatedAt').above(new Date(timestamp).toISOString())
    .first();

  // 업데이트된 항목이 있으면 변경 사항이 있는 것입니다.
  return !!updatedEntry;
}


/**
 * 지정된 시간 이후의 변경사항(Changelog)을 내보냅니다.
 * @param {string} userId 
 * @param {string | null} since - ISO 8601 형식의 타임스탬프
 * @returns {Promise<Object>}
 */
export async function exportChangelog(userId, since) {
  const changelog = {
    version: '1.0-changelog',
    since,
    timestamp: new Date().toISOString(),
    created: { entries: [], images: [] },
    updated: { entries: [], images: [] },
    deleted: { entries: [], images: [] }, // soft-delete된 항목의 ID 목록
  };

  const sinceDate = since ? new Date(since) : new Date(0);
  const sinceISO = sinceDate.toISOString();

  // Helper to safely convert blob or string to base64
  const safeToBase64 = async (data) => {
    if (!data) return null;
    if (data instanceof Blob) {
      return await blobToBase64(data, false); // false to get raw base64
    }
    if (typeof data === 'string' && data.startsWith('data:')) {
      return data.split(',')[1];
    }
    return data; // Assume it's already a raw base64 string
  };

  // 1. Entries
  const entries = await db.entries.where('userId').equals(userId).and(e => e.updatedAt > sinceISO).toArray();
  for (const entry of entries) {
    if (entry.deletedAt > sinceISO) {
      changelog.deleted.entries.push(entry.date);
    } else if (entry.createdAt > sinceISO) {
      changelog.created.entries.push(entry);
    } else {
      changelog.updated.entries.push(entry);
    }
  }

  // 2. Images
  const images = await db.images.where('userId').equals(userId).and(img => img.updatedAt > sinceISO).toArray();
  for (const img of images) {
    if (img.deletedAt > sinceISO) {
      changelog.deleted.images.push(img.id);
      continue;
    }
    
    // Convert blobs to base64 for transport
    const imageForTransport = {
      ...img,
      blob: await safeToBase64(img.blob),
      thumbnail: await safeToBase64(img.thumbnail),
    };

    if (img.createdAt > sinceISO) {
      changelog.created.images.push(imageForTransport);
    } else {
      changelog.updated.images.push(imageForTransport);
    }
  }

  return changelog;
}

/**
 * Changelog를 데이터베이스에 적용합니다.
 * @param {string} userId 
 * @param {Object} changelog 
 */
export async function importChangelog(userId, changelog) {
  const now = new Date().toISOString();

  return db.transaction('rw', db.entries, db.images, async () => {
    // 1. Deleted items
    if (changelog.deleted) {
      if (changelog.deleted.entries?.length > 0) {
        await db.entries.where('date').anyOf(changelog.deleted.entries)
          .and(e => e.userId === userId)
          .modify({ deletedAt: now, updatedAt: now });
      }
      if (changelog.deleted.images?.length > 0) {
        await db.images.where('id').anyOf(changelog.deleted.images)
          .modify({ deletedAt: now, updatedAt: now });
      }
    }

    // 2. Created and Updated items
    const allEntries = [
      ...(changelog.created?.entries || []),
      ...(changelog.updated?.entries || []),
    ].map(e => ({ ...e, userId })); // Ensure userId is correct

    const allImages = [
      ...(changelog.created?.images || []),
      ...(changelog.updated?.images || []),
    ].map(img => ({ ...img, userId })); // Ensure userId is correct

    if (allEntries.length > 0) {
      await db.entries.bulkPut(allEntries);
    }

    if (allImages.length > 0) {
      // The base64ToBlob conversion is not needed if the DB stores base64 strings
      await db.images.bulkPut(allImages);
    }
  });
}


/**
 * 사용자의 모든 데이터 중에서 가장 최근의 updatedAt 타임스탬프를 찾습니다.
 * @param {string} userId
 * @returns {Promise<string|null>} 가장 최근의 ISO 타임스탬프 문자열 또는 null
 */
export async function getLatestLocalTimestamp(userId) {
  if (!userId) return null;

  let latestTimestamp = null;

  // 모든 테이블을 순회하며 가장 최근의 updatedAt을 찾습니다.
  // 'users' 테이블은 동기화 대상이 아니므로 건너뜁니다.
  const tablesToScan = db.tables.filter(table => table.name !== 'users');

  for (const table of tablesToScan) {
    // 테이블에 'userId'와 'updatedAt' 인덱스가 있는지 확인합니다.
    const hasUserIdIndex = table.schema.indexes.some(idx => idx.keyPath === 'userId' || (Array.isArray(idx.keyPath) && idx.keyPath.includes('userId')));
    const hasUpdatedAtIndex = table.schema.indexes.some(idx => idx.keyPath === 'updatedAt');

    if (hasUserIdIndex && hasUpdatedAtIndex) {
      const latestEntry = await table
        .where('userId').equals(userId)
        .reverse()
        .sortBy('updatedAt')
        .then(items => items[0]);

      if (latestEntry && latestEntry.updatedAt) {
        if (!latestTimestamp || new Date(latestEntry.updatedAt) > new Date(latestTimestamp)) {
          latestTimestamp = latestEntry.updatedAt;
        }
      }
    }
  }

  return latestTimestamp;
}
