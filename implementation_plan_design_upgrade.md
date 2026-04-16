# 디자인 시스템 업그레이드 계획 (Phase 2)

## 목표
"Mmtm" 앱을 "Rich Aesthetics", "Glassmorphism (유리 질감)", "Dynamic Animations (동적 애니메이션)"이 적용된 프리미엄하고 심미적인 경험으로 변모시킵니다.

## 컨셉: "Ethereal Clarity (투명한 선명함)"
- **Visuals**: 깨끗하고 공기 같은 느낌, 블러(유리 질감)와 부드러운 그림자를 사용한 은은한 깊이감.
- **Colors**: 원색 위주의 평면적인 색상에서 벗어나, 그라데이션과 부드러운 색조로 정제된 팔레트.
- **Motion**: 부드러운 화면 전환, 확신을 주는 마이크로 인터랙션.

## 변경 제안 사항

### 1. CSS 변수 및 테마 (`src/index.css`)
- **새로운 컬러 팔레트**:
    - **Primary**: `#4A90E2` -> `#3B82F6` (Modern Blue) 또는 세밀한 그라데이션.
    - **Backgrounds**: Body 배경에 `mesh gradients` 또는 은은한 방사형 그라데이션 도입.
- **Glassmorphism 토큰**:
    - `--glass-bg`: `rgba(255, 255, 255, 0.7)` (반투명 배경)
    - `--glass-border`: `rgba(255, 255, 255, 0.5)` (반투명 테두리)
    - `--glass-shadow`: `0 8px 32px 0 rgba(31, 38, 135, 0.07)`
    - `--backdrop-blur`: `blur(12px)` (배경 블러 처리)
- **Typography**:
    - UI에는 `Inter` 또는 `Pretendard`를 기본으로 하여 깔끔함 유지.
    - 일기 본문에는 감성적인 Serif(명조 계열) 옵션 유지.
- **Shadows**:
    - `--shadow-soft`: `0 4px 20px rgba(0, 0, 0, 0.08)`
    - `--shadow-float`: `0 8px 30px rgba(0, 0, 0, 0.12)`

### 2. 글로벌 UI 레이아웃 (`src/components/Layout.*`)
- **Sidebar**:
    - Glassmorphism 적용: 블러가 들어간 반투명 배경.
    - 활성 메뉴 아이템에 "떠있는 듯한(Floating)" 효과 적용.
- **Content Area**:
    - 페이지 콘텐츠 진입 시 애니메이션 추가 (`fadeInUp`).
    - 카드 컨테이너(일기 목록 등)에 새로운 "Soft Card" 스타일 적용 (둥근 모서리 `16px`, 부드러운 그림자).

### 3. 컴포넌트 스타일링
- **버튼 (`src/index.css`, `styled-components`)**:
    - "Pill" 형태 또는 "Soft Rects" (`border-radius: 12px`).
    - 주요 액션(Primary)에 그라데이션 배경 적용.
    - 활성/호버 시 크기 변화 (`transform: scale(1.02)`).
- **카드 (Entries)**:
    - 뚜렷한 테두리 대신 그림자와 배경색으로 구분.
    - 호버 시 살짝 떠오르는 효과 (Hover lift effect).

### 4. 애니메이션
- **마이크로 인터랙션**:
    - 토글 스위치 (부드러운 슬라이드).
    - 체크박스 (바운스 효과).
    - 네비게이션 전환 효과.

## 실행 단계

### 1단계: 기초 작업 (`index.css`)
- [ ] 새로운 CSS 변수 정의 (Colors, Shadows, Blur).
- [ ] 글로벌 Body 배경 적용 (은은한 그라데이션).

### 2단계: 핵심 컴포넌트
- [ ] `Layout.css` 업데이트 (사이드바, 헤더).
- [ ] `index.css`의 버튼 스타일 업데이트.
- [ ] 카드 스타일 업데이트.

### 3단계: 다듬기 (Refinement)
- [ ] `Settings.jsx`, `EntryEditor.jsx` 등에서 어색한 요소 점검 및 수정.
- [ ] 모달/오버레이에 Glassmorphism 적용.

## 검증 계획

### 수동 검토
- [ ] **시각적 확인**:
    - 앱을 열었을 때 배경이 단순 흰색/회색이 아닌 그라데이션인가?
    - 사이드바와 모달에 "유리" 효과가 적용되었는가?
- [ ] **인터랙션 확인**:
    - 버튼에 마우스를 올렸을 때 반응(크기/그림자 변화)이 있는가?
    - 페이지 이동이 부드러운가?
- [ ] **다크 모드**:
    - 다크 모드로 전환했을 때도 Glassmorphism이 잘 어울리는가 (Dark Glass)?

### 자동화 테스트
- CSS 변경에 대한 별도의 자동화 테스트는 없으며, 시각적 검수를 우선합니다.
