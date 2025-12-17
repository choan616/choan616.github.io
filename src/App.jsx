import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
import { TagCloud } from './components/TagCloud';
import { StatsDashboard } from './components/StatsDashboard';
import { useTheme } from './contexts/useTheme';
import { Search, SearchResultList } from './components/Search';
import { BackupPanel } from './components/BackupPanel';
import { Settings } from './components/Settings';
import { OfflineBanner } from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { getCurrentUser, isAuthenticated } from './utils/auth';
import './App.css';
import { PasswordSetupModal } from './components/PasswordSetupModal';
import { SessionLockModal } from './components/SessionLockModal';
import { syncManager } from './services/syncManager';

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [activeTag, setActiveTag] = useState(null);

  const { theme } = useTheme();
  const { showToast } = useToast();
  const { triggerSync, triggerDebouncedSync } = useSyncContext();

  // 일기가 있는 날짜 목록 조회 (삭제된 일기 제외됨)
  const entriesDateList = useLiveQuery(async () => {
    if (!currentUser) return [];
    try {
      const { getEntriesDateList } = await import('./db/adapter');
      return await getEntriesDateList(currentUser.userId);
    } catch (error) {
      console.error('Failed to load entries list:', error);
      return [];
    }
  }, [currentUser], []);

  // 모든 일기 목록을 가져오는 useLiveQuery
  const allEntries = useLiveQuery(async () => {
    if (!currentUser) return [];
    try {
      const { getAllEntries } = await import('./db/adapter');
      return await getAllEntries(currentUser.userId);
    } catch (error) {
      console.error('Failed to load all entries:', error);
      return [];
    }
  }, [currentUser], []);
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
    const initializeApp = async () => {
      // SyncManager 초기화
      await syncManager.init();

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

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 이 useEffect는 앱 시작 시 한 번만 실행되어야 합니다.

  // 날짜 선택 핸들러 - 모바일 사이드바 닫기
  const handleDateSelect = (date) => {
    // 날짜를 선택하면 모든 필터링 상태를 초기화합니다.
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setSearchResults(null);
    setActiveTag(null);
    setShowStats(false);
  };

  // 태그 선택 핸들러
  const handleTagSelect = (tag) => {
    if (tag) {
      // 태그를 선택하면 검색 결과는 초기화
      setSearchResults(null);
      setActiveTag(tag);
      setShowStats(false); // 통계 뷰 비활성화
    } else {
      setActiveTag(null);
    }
  };

  // 검색 실행 핸들러
  const handleSearch = async (query) => {
    if (query && currentUser) {
      const { searchEntries } = await import('./db/adapter');
      const results = await searchEntries(currentUser.userId, query);
      setSearchResults(results);
      setShowStats(false); // 통계 뷰 비활성화
    } else {
      setSearchResults(null); // 검색어가 없으면 검색 모드 해제
    }
  };

  // 검색 결과 클릭 핸들러
  const handleResultClick = (date) => {
    // 날짜 선택 핸들러를 호출하여 모든 필터링 상태를 초기화합니다.
    handleDateSelect(new Date(date));
  };

  // 태그 또는 검색어에 따라 필터링된 일기 목록
  const filteredEntriesByTag = useMemo(() => {
    if (activeTag) {
      return allEntries.filter(entry => entry.tags?.includes(activeTag));
    }
    return null; // 태그 필터링이 활성화되지 않았으면 null 반환
  }, [allEntries, activeTag]);

  // 최종적으로 표시될 일기 목록 (검색, 태그 필터링 또는 전체)
  const displayedEntries = searchResults ?? filteredEntriesByTag ?? allEntries;
  const isFiltered = !!(searchResults || activeTag);

  // useLiveQuery를 사용하여 데이터 로딩, 상태 업데이트를 한 번에 처리
  useLiveQuery(async () => {
    if (!currentUser?.userId || !selectedDate) return null;

    try {
      const { getEntryWithImages } = await import('./db/adapter');
      const entryData = await getEntryWithImages(currentUser.userId, selectedDate);

      // getEntryWithImages는 이미 처리가 완료된 객체(Blob URL 등 포함)를 반환함
      // 하지만 현재 getEntryWithImages는 URL.createObjectURL을 내부적으로 처리함.
      // App.jsx의 기존 로직은 여기서 처리하고 있었으므로, adapter가 반환하는 구조에 맞게 setCurrentEntry를 업데이트해야 함.

      if (entryData) {
        setCurrentEntry(entryData);
        setIsEditing(false); // 기존 일기가 있으면 보기 모드
      } else {
        // 엔트리가 없거나 삭제된 경우
        setCurrentEntry({
          date: selectedDate,
          title: '',
          content: '',
          tags: [],
          images: [], // 새 일기는 이미지가 없음
        });
        setIsEditing(true); // 새 일기는 편집 모드
      }
    } catch (error) {
      console.error("데이터 로딩 중 오류:", error);
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

      // UI 즉시 갱신 (빈 일기 템플릿으로 교체)
      setCurrentEntry({
        date: currentEntry.date,
        title: '',
        content: '',
        images: [],
        tags: []
      });
      // 편집 모드 종료
      setIsEditing(false);

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
        // 토스트는 SyncProvider에서 이미 표시됨
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
        {/* 오프라인 배너 */}
        <OfflineBanner />

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
          userProfileButton={
            <UserProfileButton
              user={currentUser}
              onLogout={handleLogout}
              onSettingsClick={() => setShowSettings(true)}
              onBackupClick={() => setShowBackupPanel(true)}
              onStatsClick={() => setShowStats(true)}
            />
          }
          sidebar={showStats ? (
            <div className="sidebar-actions">
              <button className="btn-stats" onClick={() => setShowStats(false)}>
                ⬅️ 일기로 돌아가기
              </button>
            </div>
          ) : (
            <>
              <Search onSearch={handleSearch} onClear={() => handleSearch('')} isSearching={!!searchResults} />
              {searchResults ? ( // `isFiltered` 대신 `searchResults`를 직접 확인
                <SearchResultList results={searchResults} onResultClick={handleResultClick} />
              ) : (
                <>
                  <Calendar selectedDate={selectedDate} onSelect={handleDateSelect} entryDates={entriesDateList} currentUser={currentUser} />
                  {/* 통계 버튼은 프로필 메뉴로 이동됨 */}
                  {/* 검색 중이 아닐 때만 태그 클라우드 표시 */}
                  {!searchResults && <TagCloud entries={allEntries} onTagSelect={handleTagSelect} activeTag={activeTag} />}
                </>
              )}
            </>
          )}
          main={showStats
            ? <StatsDashboard key={theme} entries={allEntries} />
            : (
              isFiltered
                ? <SearchResultList
                  results={displayedEntries}
                  onResultClick={handleResultClick}
                />
                : <EntryEditor
                  entry={currentEntry}
                  onSave={handleSave} isEditing={isEditing} setIsEditing={setIsEditing} onImageDelete={handleImageDelete} onDelete={handleDelete}
                />
            )}
          carousel={!showStats && !isFiltered && currentEntry?.images?.length > 0 ? <ImageCarousel images={currentEntry.images} /> : null}
        />

        {showBackupPanel && (
          <BackupPanel
            currentUser={currentUser}
            onClose={() => setShowBackupPanel(false)}
            // 데이터 복원 후 페이지를 새로고침하는 대신,
            // useLiveQuery가 자동으로 데이터를 다시 로드하므로 별도 작업이 필요 없습니다.
            onDataRestored={() => console.log('Data restored. UI will update automatically.')}
          />
        )}

        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            showToast={showToast}
          />
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
