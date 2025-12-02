import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ToastProvider, useToast } from './components/Toast';
import { Layout } from './components/Layout';
import { Calendar } from './components/Calendar';
import { ImageCarousel } from './components/ImageCarousel';
import { EntryEditor } from './components/EntryEditor';
import { BackupPanel } from './components/BackupPanel';
import { getEntryWithImages, saveEntryWithImages } from './db/adapter';
import './App.css';

function AppContent() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { showToast } = useToast();

  // 선택된 날짜의 일기 로드
  useEffect(() => {
    loadEntry(selectedDate);
  }, [selectedDate]);

  // 날짜 선택 핸들러 - 모바일 사이드바 닫기
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setIsMobileSidebarOpen(false); // 모바일에서 날짜 선택 시 사이드바 닫기
  };

  async function loadEntry(date) {
    try {
      setIsLoading(true);
      const entry = await getEntryWithImages(date);

      if (entry) {
        setCurrentEntry(entry);
        // 기존 일기가 있으면 보기 모드로
        setIsEditing(false);
      } else {
        // 새 일기 생성
        setCurrentEntry({
          date,
          title: '',
          content: '',
          tags: [],
          images: []
        });
        // 빈 일기는 자동으로 편집 모드로
        setIsEditing(true);
      }
    } catch (error) {
      console.error('일기 로드 오류:', error);
      showToast('일기를 불러올 수 없습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(entryData, imageFiles) {
    try {
      await saveEntryWithImages(entryData, imageFiles, (current, total) => {
        if (total > 0) {
          showToast(`이미지 압축 중... (${current}/${total})`, 'info', 500);
        }
      });

      // 저장 후 다시 로드 (이미지 URL 갱신)
      await loadEntry(selectedDate);

      showToast('✅ 저장되었습니다', 'success');
    } catch (error) {
      console.error('저장 오류:', error);
      throw error;
    }
  }

  return (
    <>
      <Layout
        currentEntry={currentEntry}
        onBackupClick={() => setShowBackupPanel(true)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      >
        {{
          sidebar: <Calendar selectedDate={selectedDate} onSelect={handleDateSelect} />,
          carousel: <ImageCarousel images={currentEntry?.images || []} />,
          editor: (
            <EntryEditor
              entry={currentEntry}
              onSave={handleSave}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
            />
          )
        }}
      </Layout>

      {showBackupPanel && (
        <BackupPanel onClose={() => setShowBackupPanel(false)} />
      )}
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
