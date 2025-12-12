# 프로젝트 메모

## Google Drive 자동 동기화 고도화 계획

**작성일**: 2025-12-04  
**문서 위치**: `AUTO_SYNC_ROADMAP.md`

### 🎯 핵심 목표
현재 수동 백업 시스템을 **앱 접속 시 자동으로 동기화**되는 시스템으로 고도화

### 📋 로드맵 개요
- **Phase 1**: 자동 동기화 기반 구축 (1-2주)
  - 앱 시작 시 자동 동기화
  - 주기적 동기화
  - 네트워크 상태 체크

- **Phase 2**: 양방향 동기화 및 충돌 해결 (2-3주)
  - 변경 사항 추적
  - Pull/Push 동기화
  - 충돌 해결 메커니즘

- **Phase 3**: 사용자 경험 개선 (1-2주)
  - 동기화 상태 표시
  - 설정 페이지
  - 오프라인 지원

- **Phase 4**: 최적화 및 고급 기능 (2-3주)
  - 성능 최적화
  - 버전 관리
  - 다중 계정 지원

- **Phase 5**: 모니터링 및 안정화 (1주)
  - 에러 처리
  - 테스트 및 검증

### ⚡ MVP (2주)
1. **Week 1**: 기본 자동 동기화 + 상태 표시
2. **Week 2**: 설정 페이지 + 에러 처리

### 🔑 핵심 파일
- `src/services/syncManager.js` - 동기화 관리자 (신규)
- `src/contexts/SyncContext.jsx` - 전역 상태 관리 (신규)
- `src/services/googleDrive.js` - 기존 Google Drive API 서비스
- `src/components/BackupPanel.jsx` - 백업 UI
- `src/App.jsx` - 앱 진입점 (자동 동기화 트리거)

### 💡 구현 원칙
1. **점진적 롤아웃**: 기존 수동 백업 유지하며 자동화 추가
2. **데이터 안전성 최우선**: 동기화 실패 시 로컬 데이터 보존
3. **배터리/데이터 고려**: Wi-Fi 환경에서만 자동 동기화
4. **명확한 피드백**: 동기화 상태 실시간 표시

### 📚 참고 문서
- 상세 로드맵: `AUTO_SYNC_ROADMAP.md`
- Google Drive API: https://developers.google.com/drive/api
- Offline First: https://offlinefirst.org/

---

**Note**: 이 프로젝트는 PWA 일기 앱으로, Google Drive 동기화를 통해 다중 디바이스 지원을 목표로 합니다.
