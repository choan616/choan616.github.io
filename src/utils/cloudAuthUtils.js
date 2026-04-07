import { CloudStorageFactory } from '../services/cloudStorage/CloudStorageFactory';

const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map(email => email.trim())
  .filter(Boolean);

/**
 * 클라우드 제공자로 로그인하고 로컬 DB 사용자를 생성/조회합니다.
 * @param {string} provider - 'google' | 'dropbox'
 * @returns {Promise<{ cloudService, cloudUser, userId }>}
 */
export async function signInWithCloudProvider(provider) {
  const cloudService = await CloudStorageFactory.getService(provider);
  await cloudService.signIn();

  const cloudUser = await cloudService.getCurrentUser();
  if (!cloudUser) throw new Error('사용자 정보를 가져올 수 없습니다.');

  if (provider === 'google' && ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(cloudUser.email)) {
    await cloudService.signOut();
    throw new Error(`접근 권한이 없는 계정입니다: ${cloudUser.email}`);
  }

  const { createUser } = await import('../db/adapter');
  const userId = await createUser(
    { email: cloudUser.email, name: cloudUser.name },
    { imageUrl: cloudUser.imageUrl }
  );

  return { cloudService, cloudUser, userId };
}
