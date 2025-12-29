import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { UserProvider } from './contexts/UserContext'; // UserProvider import
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ToastProvider } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useSyncContext } from './contexts/SyncContext';
import { SyncProvider } from './contexts/SyncProvider';
import { UserAuth } from './components/UserAuth';
import { UserProfileButton } from './components/UserProfileButton';
import { Layout } from './components/Layout';
import { Calendar } from './components/Calendar';
import { EntryEditor } from './components/EntryEditor';
import { TagCloud } from './components/TagCloud';
import { useUiSettings } from './contexts/useUiSettings';
import ErrorBoundary from './components/ErrorBoundary';
import { setCurrentUser as setAuthUser, getCurrentUser, clearCurrentUser, isAuthenticated } from './utils/auth';
import { syncManager } from './services/syncManager';
import { OfflineBanner } from './components/OfflineBanner';
import { googleDriveService } from './services/googleDrive';

import { Search, SearchResultList } from './components/Search';
import { StatsDashboard } from './components/StatsDashboard';
import { ImageGallery } from './components/ImageGallery';
import { ImageCarousel } from './components/ImageCarousel';
import { BackupPanel } from './components/BackupPanel';
import { Settings } from './components/Settings';
import { SessionLockModal } from './components/SessionLockModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import './App.css';
// ...
function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchStartDate, setSearchStartDate] = useState(null);
  const [searchEndDate, setSearchEndDate] = useState(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchCurrentPage, setSearchCurrentPage] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const ENTRIES_PER_PAGE = 15;
  const { settings } = useUiSettings();
  const theme = settings.theme;
  const { showToast } = useToast();
  const { triggerSync, triggerDebouncedSync, lastSyncTime } = useSyncContext();

  // [Code Review Fix] 메모리 누수 방지: currentEntry가 변경되거나 언마운트될 때 이전 Object URL 해제
  useEffect(() => {
    return () => {
      if (currentEntry?.images) {
        currentEntry.images.forEach((img) => {
          if (img.url) URL.revokeObjectURL(img.url);
          if (img.thumbnailUrl) URL.revokeObjectURL(img.thumbnailUrl);
        });
      }
    };
  }, [currentEntry]);

  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (onboardingCompleted !== 'true') {
      // Use a small delay to ensure the main UI is visible before showing the guide
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, []);

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
  }, [currentUser, lastSyncTime], []);

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
  }, [currentUser, lastSyncTime]);
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
      try {
        if (isAuthenticated()) {
          const userId = getCurrentUser();
          if (userId) {
            const { getUser } = await import('./db/adapter');
            const user = await getUser(userId);
            if (user) {
              // 저장된 사용자로 인증 처리
              await handleAuthenticated(user, true);
              return;
            }
          }
        }

        // 기존 로그인 이력이 있는 경우(Google 등) 게스트 자동 진입 방지
        const lastLoginType = localStorage.getItem('lastLoginType');
        if (lastLoginType === 'google') {
          return;
        }

        // 인증된 사용자가 없으면 '게스트 모드'로 즉시 시작
        const guestUser = {
          userId: 'guest-user',
          name: '내 다이어리',
          email: 'local@diary.app',
          isGuest: true,
        };
        await handleAuthenticated(guestUser, true);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
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
    setCurrentQuery('');
    setSearchStartDate(null);
    setSearchEndDate(null);
    setSearchCurrentPage(1);
    setActiveTag(null);
    setShowStats(false);
    setShowGallery(false);
    setIsContentVisible(true); // 날짜 선택 시 컨텐츠 표시
  };

  // 태그 선택 핸들러
  const handleTagSelect = (tag) => {
    if (tag) {
      setSearchCurrentPage(1);
      // 태그를 선택하면 검색 결과는 초기화
      setSearchResults(null);
      setCurrentQuery('');
      setSearchStartDate(null);
      setSearchEndDate(null);
      setActiveTag(tag);
      setShowStats(false); // 통계 뷰 비활성화
      setShowGallery(false);
    } else {
      setActiveTag(null);
    }
  };

  // 검색 실행 핸들러
  const handleSearch = async (query) => {
    setSearchCurrentPage(1);
    if (query && currentUser) {
      const { searchEntries } = await import('./db/adapter');
      const results = await searchEntries(currentUser.userId, query, searchStartDate, searchEndDate);
      setSearchResults(results);
      setCurrentQuery(query);
      setShowStats(false); // 통계 뷰 비활성화
      setShowGallery(false);
    } else {
      setSearchResults(null); // 검색어가 없으면 검색 모드 해제
      setCurrentQuery('');
    }
  };

  const handleFilterClear = () => {
    setSearchStartDate(null);
    setSearchEndDate(null);
    // 필터가 지워지면 현재 쿼리로 다시 검색 (날짜 제한 없이)
    if (currentQuery) {
      handleSearch(currentQuery);
    }
  };

  // 날짜 변경 시 자동 재검색 (현재 검색어가 있을 경우)
  useEffect(() => {
    if (currentQuery) {
      handleSearch(currentQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchStartDate, searchEndDate]);

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

  // 검색 결과 페이지네이션
  const paginatedSearchResults = useMemo(() => {
    if (!searchResults) return null;
    const startIndex = (searchCurrentPage - 1) * ENTRIES_PER_PAGE;
    const endIndex = startIndex + ENTRIES_PER_PAGE;
    return searchResults.slice(startIndex, endIndex);
  }, [searchResults, searchCurrentPage]);

  // 태그 필터링 결과 페이지네이션
  const paginatedTagResults = useMemo(() => {
    if (!filteredEntriesByTag) return null;
    const startIndex = (searchCurrentPage - 1) * ENTRIES_PER_PAGE;
    const endIndex = startIndex + ENTRIES_PER_PAGE;
    return filteredEntriesByTag.slice(startIndex, endIndex);
  }, [filteredEntriesByTag, searchCurrentPage]);

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
      const { saveEntryWithImages, getEntryWithImages } = await import('./db/adapter');
      await saveEntryWithImages(currentUser.userId, fullEntryData, imageFiles, (current, total) => {
        if (total > 0) {
          showToast(`이미지 압축 중... (${current}/${total})`, 'info', 500);
        }
      });

      // 저장 후 즉시 최신 데이터를 다시 불러와 상태 업데이트 (화면 즉시 반영)
      const savedEntry = await getEntryWithImages(currentUser.userId, entryData.date);
      if (savedEntry) {
        setCurrentEntry(savedEntry);
      }

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

  async function handleLogout() {
    try {
      // Google Drive 서비스에서 명시적으로 로그아웃합니다.
      setAuthUser(null); // auth.js를 통해 localStorage의 사용자 ID를 제거합니다.
      clearCurrentUser(); // localStorage에서 사용자 ID를 제거합니다.
      await googleDriveService.signOut();
      // 게스트 사용자로 전환합니다.
      const guestUser = {
        userId: 'guest-user',
        name: '내 다이어리',
        email: 'local@diary.app',
        isGuest: true,
      };
      // 게스트 모드로 전환하므로 isInitialLoad를 true로 설정하여 동기화를 방지합니다.
      handleAuthenticated(guestUser, true);
      showToast('로그아웃 되었습니다.', 'info');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      showToast('로그아웃에 실패했습니다.', 'error');
    }
  }

  async function handleAuthenticated(user, isInitialLoad = false) {
    setCurrentUser(user);
    setAuthUser(user.userId); // auth.js를 통해 localStorage에 사용자 ID를 설정합니다.

    // 로그인 유형 저장
    localStorage.setItem('lastLoginType', user.isGuest ? 'guest' : 'google');

    // 게스트 사용자가 아닐 경우에만 동기화 관련 로직 실행
    if (!user.isGuest) {
      syncManager.setUserId(user.userId); // syncManager에 userId 설정
      // 사용자가 인증된 후에 SyncManager를 초기화합니다.
      await syncManager.init();
    } else {
      syncManager.setUserId(null); // 게스트 모드에서는 syncManager 비활성화
    }

    // 최초 접속 또는 게스트 모드에서는 자동 동기화 실행 안 함
    // 수동 로그인 시에만 자동 동기화 실행
    if (!isInitialLoad && !user.isGuest) {
      triggerSync({ silent: false }).catch(err => {
        console.log('로그인 후 동기화 실패:', err);
        // 토스트는 SyncProvider에서 이미 표시됨
      });
    } else {
      console.log('최초 접속: 자동 동기화 건너뜀');
    }

    // 앱 시작 시에만 고아 이미지 정리
    if (isInitialLoad && !user.isGuest) {
      const { deleteOrphanedImages } = await import('./db/adapter');
      const deletedCount = await deleteOrphanedImages(user.userId);
      if (deletedCount > 0) {
        console.log(`정리 완료: ${deletedCount}개의 고아 이미지를 삭제했습니다.`);
        showToast(`${deletedCount}개의 불필요한 이미지를 정리했습니다.`, 'info');
      }
    }
  }

  const handleOnboardingFinish = (dontShowAgain) => {
    if (dontShowAgain) {
      localStorage.setItem('onboarding_completed', 'true');
    }
    setShowOnboarding(false);
  };

  // 로딩 중일 때 표시 (깜빡임 방지)
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-color, #ffffff)' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0,0,0,0.1)',
          borderRadius: '50%',
          borderTopColor: 'var(--primary-color, #4a90e2)',
          animation: 'spin 1s ease-in-out infinite',
          marginBottom: '20px'
        }} />
        <div style={{ color: 'var(--text-secondary, #666)' }}>앱을 불러오는 중...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 화면 표시
  if (!currentUser) {
    return <UserAuth onAuthenticated={handleAuthenticated} />; // 이 부분은 유지되지만, 초기 로딩 시에는 거의 보이지 않게 됩니다.
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
          sidebar={showStats || showGallery ? (
            <div className="sidebar-actions">
              <button className="btn-stats" onClick={() => { setShowStats(false); setShowGallery(false); }}>
                ⬅️ 일기로 돌아가기
              </button>
            </div>
          ) : (
            <>
              <Search
                onSearch={handleSearch}
                onClear={() => handleSearch('')}
                isSearching={!!searchResults}
                startDate={searchStartDate}
                endDate={searchEndDate}
                onStartDateChange={setSearchStartDate}
                onEndDateChange={setSearchEndDate}
                onFilterClear={handleFilterClear}
              />
              {/* 검색 결과는 메인 패널에 표시되므로, 사이드바에서는 캘린더와 태그 클라우드를 조건부로 렌더링합니다. */}
              {!searchResults && (
                <>
                  <Calendar selectedDate={selectedDate} onSelect={handleDateSelect} entryDates={entriesDateList} currentUser={currentUser} />
                  <div style={{  }}>
                    <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => setShowGallery(true)}>
                      <span>🖼️</span> 사진 모아보기
                    </button>
                  </div>
                  {/* 통계 버튼은 프로필 메뉴로 이동됨 */}
                  {/* 검색 중이 아닐 때만 태그 클라우드 표시 */}
                  <TagCloud entries={allEntries} onTagSelect={handleTagSelect} activeTag={activeTag} />
                </>
              )}
            </>
          )}
          main={
            showStats ? (
              <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: 'var(--text-secondary)' }}>통계 불러오는 중...</div>}>
                <StatsDashboard
                  key={theme}
                  entries={allEntries}
                  onSelectEntry={handleResultClick}
                />
              </Suspense>
            ) : showGallery ? (
              <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: 'var(--text-secondary)' }}>갤러리 불러오는 중...</div>}>
                <ImageGallery userId={currentUser.userId} onEntryClick={handleResultClick} onClose={() => setShowGallery(false)} />
              </Suspense>
            ) : searchResults ? (
              <SearchResultList
                results={paginatedSearchResults}
                totalResults={searchResults.length}
                currentPage={searchCurrentPage}
                onPageChange={setSearchCurrentPage}
                itemsPerPage={ENTRIES_PER_PAGE}
                onResultClick={handleResultClick}
                query={currentQuery}
              />
            ) : activeTag ? (
              <SearchResultList
                results={paginatedTagResults}
                totalResults={filteredEntriesByTag.length}
                currentPage={searchCurrentPage}
                onPageChange={setSearchCurrentPage}
                itemsPerPage={ENTRIES_PER_PAGE}
                onResultClick={handleResultClick}
                query={`#${activeTag}`}
              />
            ) : isContentVisible ? (
              <EntryEditor
                entry={currentEntry}
                onSave={handleSave}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onImageDelete={handleImageDelete}
                onDelete={handleDelete}
              />
            ) : (
              <div className="main-placeholder">
                <div className="main-placeholder-icon">🔒</div>
                <p>달력에서 날짜를 선택하여 일기를 확인하세요.</p>
              </div>
            )
          }
          carousel={!showStats && !showGallery && !isFiltered && currentEntry?.images?.length > 0 ? (
            <Suspense fallback={null}>
              <ImageCarousel images={currentEntry.images} />
            </Suspense>
          ) : null}
        />

        {showBackupPanel && (
          <Suspense fallback={null}>
            <BackupPanel
              currentUser={currentUser}
              onClose={() => setShowBackupPanel(false)}
              onAuthenticated={handleAuthenticated}
              onDataRestored={() => console.log('Data restored. UI will update automatically.')}
            />
          </Suspense>
        )}

        {showSettings && (
          <Suspense fallback={null}>
            <Settings
              isGuest={currentUser.isGuest}
              onClose={() => setShowSettings(false)}
              showToast={showToast}
            />
          </Suspense>
        )}
        {/* 전역 모달: PIN 설정 및 잠금 모달 */}
        <SessionLockModal />

        {showOnboarding && <OnboardingGuide onFinish={handleOnboardingFinish} />}
      </>
    </ErrorBoundary>
  );
}

// App 컴포넌트가 Toast와 Sync 컨텍스트를 제공하도록 수정
function App() {
  return (
    <UserProvider>
      <ToastProvider>
        {/* SyncProvider를 ToastProvider 내부에 위치시켜 useToast 훅을 사용할 수 있게 함 */}
        <SyncProvider>
          <AppContent />
        </SyncProvider>
      </ToastProvider>
    </UserProvider>
  );
}

export default App;
