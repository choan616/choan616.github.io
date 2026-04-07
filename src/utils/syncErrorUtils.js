/**
 * 동기화 에러를 사용자 친화적인 메시지로 변환합니다.
 * @param {Error} error
 * @returns {string}
 */
export function formatSyncError(error) {
  const msg = error?.message || '';

  if (msg.includes('central directory')) return '백업 파일이 손상되었을 수 있습니다';
  if (msg.includes('오프라인')) return '인터넷 연결을 확인해주세요';
  if (msg.includes('Wi-Fi')) return 'Wi-Fi 연결이 필요합니다 (설정에서 변경 가능)';
  if (msg.includes('로그인')) return 'Google Drive 로그인이 필요합니다';
  if (error?.code === 'PASSWORD_REQUIRED') return '암호화된 백업입니다. 설정에서 비밀번호를 입력해주세요.';

  return msg || '알 수 없는 오류';
}
