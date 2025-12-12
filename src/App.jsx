import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastProvider } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useSyncContext } from './contexts/SyncContext';
import { SyncProvider } from './contexts/SyncProvider';
import { UserAuth } from './components/UserAuth';
import { UserProfileButton } from './components/UserProfileButton';
import { Layout } from './components/Layout';
import { Calendar } from './components/Calendar';
import { ImageCarousel } from './components/ImageCarousel';
import { EntryEditor } from './components/EntryEditor';
import { BackupPanel } from './components/BackupPanel';
import ErrorBoundary from './components/ErrorBoundary'; // <--- 수정
import { getCurrentUser, isAuthenticated } from './utils/auth';
import './App.css';
import { PasswordSetupModal } from './components/PasswordSetupModal';
import { SessionLockModal } from './components/SessionLockModal';
import { syncManager } from './services/syncManager';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);  // Lazy load settings component
  const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));

  const { showToast } = useToast();
  const { triggerSync, triggerDebouncedSync } = useSyncContext();

  // PWA 서비스 워커 업데이트 로직
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      showToast('새 버전이 있습니다. 앱을 업데이트 해주세요.', 'info', 0); // 0 = 무한 지속
    }
    if (offlineReady) {
      showToast('앱이 오프라인에서 동작할 준비가 되었습니다.', 'success');
    }
  }, [needRefresh, offlineReady, showToast]);

  // 인증 확인
  useEffect(() => {
    // 앱 시작 시 인증 상태를 확인하고 사용자를 설정합니다.
    // 이 로직은 handleAuthenticated 함수로 통합되어 일관성을 유지합니다.
    const initializeUser = async () => {
      if (isAuthenticated() && !currentUser) {
        const userId = getCurrentUser();
        if (userId) {
          const { getUser } = await import('./db/adapter');
          const user = await getUser(userId);
          if (user) {
            // 로그인 시 실행되는 로직과 동일한 함수를 호출하여 일관성 보장
            handleAuthenticated(user, true);
          }
        }
      }
    };

    initializeUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 이 useEffect는 앱 시작 시 한 번만 실행되어야 합니다.

  // 날짜 선택 핸들러 - 모바일 사이드바 닫기
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // useLiveQuery를 사용하여 데이터 로딩, 상태 업데이트를 한 번에 처리
  useLiveQuery(async () => {
    if (!currentUser?.userId || !selectedDate) return null;

    setIsLoading(true);
    try {
      const entry = await db.entries.get([currentUser.userId, selectedDate]);
      const imageRecords = await db.images.where({ userId: currentUser.userId, entryDate: selectedDate }).toArray();

      // Clean up previous object URLs before setting the new state.
      currentEntry?.images?.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
        if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.thumbnailUrl);
        }
      });

      const imageUrls = imageRecords.map(img => {
        // Path 1: Data is a Base64 string (from iOS/Safari)
        if (typeof img.blob === 'string' && typeof img.thumbnail === 'string') {
          return {
            id: img.id,
            url: img.blob, // Use data: URL directly
            thumbnailUrl: img.thumbnail, // Use data: URL directly
            createdAt: img.createdAt,
          };
        }

        // Path 2: Data is a Blob (from other browsers)
        if (img.blob instanceof Blob && img.thumbnail instanceof Blob) {
          return {
            id: img.id,
            url: URL.createObjectURL(img.blob),
            thumbnailUrl: URL.createObjectURL(img.thumbnail),
            createdAt: img.createdAt,
          };
        }

        console.warn(`Skipping image ${img.id} due to invalid or missing image data.`);
        return null;
      }).filter(Boolean);

      if (entry) {
        setCurrentEntry({ ...entry, images: imageUrls });
        setIsEditing(false); // 기존 일기가 있으면 보기 모드
      } else {
        setCurrentEntry({
          date: selectedDate,
          title: '',
          content: '',
          tags: [],
          images: [], // 새 일기는 이미지가 없음
        });
        setIsEditing(true); // 새 일기는 편집 모드
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.userId, selectedDate]); // 의존성 배열

  async function handleSave(entryData, imageFiles) {
    if (!currentUser) return;

    try {
      // entryData에 현재 이미지 목록(currentEntry.images)을 포함하여 전달
      const fullEntryData = {
        ...entryData,
        images: currentEntry?.images || [],
      };
      const { saveEntryWithImages } = await import('./db/adapter');
      await saveEntryWithImages(currentUser.userId, fullEntryData, imageFiles, (current, total) => {
        if (total > 0) {
          showToast(`이미지 압축 중... (${current}/${total})`, 'info', 500);
        }
      });

      // 저장 후 다시 로드할 필요 없음. useLiveQuery가 자동으로 갱신.
      showToast('✅ 저장되었습니다', 'success');

      // 저장 후 지연 동기화 트리거
      triggerDebouncedSync();
    } catch (error) {
      console.error('저장 오류:', error);
      // 에러를 다시 던져서 EntryEditor의 handleSave까지 전파되도록 합니다.
      throw error;
    }
  }

  async function handleDelete() {
    if (!currentUser || !currentEntry) return;

    // 사용자에게 삭제 확인
    if (!window.confirm(`'${currentEntry.date}' 일기를 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const { deleteEntry } = await import('./db/adapter');
      await deleteEntry(currentUser.userId, currentEntry.date);
      showToast('일기가 삭제되었습니다.', 'success');

      // 삭제 후 현재 날짜의 빈 일기를 다시 로드할 필요 없음. useLiveQuery가 자동으로 처리.
      triggerDebouncedSync();
    } catch (error) {
      console.error('일기 삭제 오류:', error);
      showToast('일기 삭제에 실패했습니다.', 'error');
    }
  }

  function handleImageDelete(imageId) {
    // 삭제된 이미지를 currentEntry에서 즉시 제거
    setCurrentEntry(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentEntry(null);
    syncManager.setUserId(null); // syncManager에서 userId 제거
  }

  async function handleAuthenticated(user, isInitialLoad = false) {
    setCurrentUser(user);
    syncManager.setUserId(user.userId); // syncManager에 userId 설정

    // 최초 접속 시에는 동기화 하지 않음 (변경됨)
    // 수동 로그인 시에만 자동 동기화 실행
    if (!isInitialLoad) {
      triggerSync({ silent: false }).catch(err => {
        console.log('로그인 후 동기화 실패:', err);
        if (err.message.includes('central directory')) {
          showToast('자동 동기화 실패: Drive의 백업 파일이 손상되었을 수 있습니다.', 'error');
        }
      });
    } else {
      console.log('최초 접속: 자동 동기화 건너뜀');
    }

    // 앱 시작 시에만 고아 이미지 정리
    if (isInitialLoad) {
      const { deleteOrphanedImages } = await import('./db/adapter');
      const deletedCount = await deleteOrphanedImages(user.userId);
      if (deletedCount > 0) {
        console.log(`정리 완료: ${deletedCount}개의 고아 이미지를 삭제했습니다.`);
        showToast(`${deletedCount}개의 불필요한 이미지를 정리했습니다.`, 'info');
      }
    }
  }

  // 인증되지 않은 경우 로그인 화면 표시
  if (!currentUser) {
    return <UserAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <ErrorBoundary>
      <>
        {/* PWA 업데이트 알림 UI */}
        {needRefresh && (
          <div className="pwa-update-toast">
            <span>새 버전이 있습니다.</span>
            <button className="btn btn-primary btn-small" onClick={() => updateServiceWorker(true)}>
              새로고침
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setNeedRefresh(false)}>닫기</button>
          </div>
        )}

        <Layout
          currentEntry={currentEntry}
          isLoading={isLoading}
          onBackupClick={() => setShowBackupPanel(true)}
          userProfileButton={
            <UserProfileButton
              user={currentUser}
              onLogout={handleLogout}
              onSettingsClick={() => setShowSettings(true)}
              onBackupClick={() => setShowBackupPanel(true)}
            />
          }
        >
          {{
            sidebar: <Calendar selectedDate={selectedDate} onSelect={handleDateSelect} userId={currentUser.userId} />,
            carousel: <ImageCarousel images={currentEntry?.images || []} />,
            editor: (
              <EntryEditor
                entry={currentEntry}
                onSave={handleSave}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onImageDelete={handleImageDelete}
                onDelete={handleDelete}
              />
            )
          }}
        </Layout>

        {showBackupPanel && (
          <BackupPanel
            currentUser={currentUser}
            onClose={() => setShowBackupPanel(false)}
          />
        )}

        {showSettings && (
          <React.Suspense fallback={<div>Loading...</div>}>
            <Settings
              onClose={() => setShowSettings(false)}
            />
          </React.Suspense>
        )}
        {/* 전역 모달: PIN 설정 및 잠금 모달 */}
        <PasswordSetupModal />
        <SessionLockModal />
      </>
    </ErrorBoundary>
  );
}

// App 컴포넌트가 Toast와 Sync 컨텍스트를 제공하도록 수정
function App() {
  return (
    <ToastProvider>
      {/* SyncProvider를 ToastProvider 내부에 위치시켜 useToast 훅을 사용할 수 있게 함 */}
      <SyncProvider><AppContent /></SyncProvider>
    </ToastProvider>
  );
}

export default App;
