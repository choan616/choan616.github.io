import { db } from './db';

const METADATA_ID = 1; // 테이블에 단일 레코드만 유지
const DEVICE_ID_KEY = 'sync_device_id';

/**
 * 간단한 랜덤 문자열을 생성합니다.
 * @returns {string} 랜덤 문자열
 */
const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * 기기의 고유 ID를 가져오거나 생성합니다.
 * ID는 localStorage에 저장하여 앱 세션 간에 유지됩니다.
 * @returns {string} 기기 고유 ID
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateRandomId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

/**
 * 동기화 메타데이터를 가져옵니다.
 * 메타데이터가 없으면 기본값을 생성하여 반환합니다.
 * @returns {Promise<{id: number, lastSyncAt: string | null, remoteFileId: string | null, lastSyncDeviceId: string | null}>}
 */
export const getSyncMetadata = async () => {
  let metadata = await db.syncMetadata.get(METADATA_ID);
  if (!metadata) {
    // 기본 메타데이터 객체 생성
    const defaultMetadata = {
      id: METADATA_ID,
      lastSyncAt: null,
      remoteFileId: null,
      lastSyncDeviceId: null,
    };
    // 데이터베이스에 기본값 저장 시도 (경합 상태 방지)
    try {
      await db.syncMetadata.add(defaultMetadata);
      metadata = defaultMetadata;
    } catch {
      // 다른 탭/작업에서 이미 추가한 경우, 다시 가져옴
      metadata = await db.syncMetadata.get(METADATA_ID);
    }
  }
  return metadata;
};

/**
 * 동기화 메타데이터를 업데이트합니다.
 * @param {Object} data - 업데이트할 데이터
 * @param {string} [data.lastSyncAt] - 마지막 동기화 시간 (ISO 문자열)
 * @param {string} [data.remoteFileId] - 원격 파일 ID
 * @param {string} [data.lastSyncDeviceId] - 마지막 동기화 기기 ID
 * @returns {Promise<number>}
 */
export const updateSyncMetadata = async ({ lastSyncAt, remoteFileId, lastSyncDeviceId }) => {
  const updateData = {};
  if (lastSyncAt !== undefined) updateData.lastSyncAt = lastSyncAt;
  if (remoteFileId !== undefined) updateData.remoteFileId = remoteFileId;
  if (lastSyncDeviceId !== undefined) updateData.lastSyncDeviceId = lastSyncDeviceId;

  if (Object.keys(updateData).length === 0) {
    return;
  }
  
  return db.syncMetadata.update(METADATA_ID, updateData);
};
