# 체크리스트

열려 있는 작업만 둔다. 끝난 항목은 지운다 (이력은 커밋에 있다).
계획과 배경은 `implementation_plan_design_v2.md`, 결정은 `decisions.md`, 세션 분배는 `handoff.md`.

## 축 A — 기존 요소 외형 개선 (구조·기능 변경 없음)

- [ ] A8 `.pwa-update-toast` 배경 `#2c3e50` → 토큰. `max-content`/`keep-all`은 유지
- [ ] 축 A 완료 후 라이트·다크 육안 리뷰 (여기서 멈춤)

## 계획에 없던 것 (S2가 발견, 고치지 않고 적어 둠)

- [ ] `UserAuth.css`가 전역 `:root`/`.dark`에 `--accent-color`(옛 파랑 `#4a90e2`) `--accent-bg-light` `--bg-color` `--border-color-light` 등을 아직 둔다. A5에서 겹치는 4개 변수와 전역 `.btn`·`.btn-primary`는 지웠다. 남은 변수는 `Switch.jsx` `EncryptionSettings.jsx` `SessionLockModal.jsx` `OnboardingGuide.css` `EntryEditor.css:596`이 참조해 옛 파랑이 그대로 찍힌다. 토큰(`--accent-primary` 등)으로 바꿔야 한다
- [ ] `Modal.css:11`이 쓰는 `--shadow-color`가 어디에도 정의돼 있지 않다 → 선언 전체가 무효라 모달 그림자가 원래 안 나온다
- [ ] `TagCloud.jsx:46,54`의 className이 ``clickable${... 'active' ...}``로 공백이 없어 `clickableactive`가 된다. 선택된 태그에 `.active` 스타일이 안 붙는다 (JSX 수정이라 축 A 밖)
- [ ] `EntryEditor.css`의 `.entry-view .tag-item`이 정의되지 않은 `--tag-bg` `--tag-color` `--tag-color-strong`을 쓴다. 읽기 화면 태그가 칩 면 없이 글자만 나온다. `.tag` 클래스는 JSX에서 쓰이지 않는 듯하다 (죽은 규칙 후보)
- [ ] `Toast.css`의 `.toast` 배경이 `white` 하드코딩이라 다크에서 흰 토스트가 뜬다. 글자색은 별도 확인 필요 (A5에서 반경·그림자만 바꿈)
- [ ] `--chart-color-*-rgb`가 옛 파랑/초록/빨강 그대로다. 시안에 값이 없어 A1에서 건드리지 않았다 (B3·B4에서 결정)
- [ ] `--shadow-soft`는 선언만 있고 참조가 0건이다 (기존 죽은 변수)

## 축 B — 신규 기능 (싼 것부터)

- [ ] B4 `ContributionHeatmap`을 `StatsDashboard`에 연결 (현재 죽은 컴포넌트)
- [ ] B5 `OnThisDay`를 메인 화면 하단에도 배치
- [ ] B8 사진 개수 표시. `count()`만 쓰고 `deletedAt` 필터는 붙이지 않는다
- [ ] B3 통계 기간 선택 (올해 / 이번 달 / 전체)
- [ ] B2 자동 저장 (본문·태그만 디바운스. 이미지 업로드와 겹치지 않게)
- [ ] B2 자동 저장 assert 자체 점검 남기기
- [ ] B6 스키마 v11에 `[userId+entryDate]` 인덱스 추가
- [ ] B6 "사진 있는 날" 필터 (태그 필터와 같은 클라이언트 경로)
- [ ] B1 모바일 하단 탭 + FAB. 데스크톱 2단은 유지
- [ ] B1 iOS `env(safe-area-inset-bottom)` 확인, `sidebarOpen` 잔재 제거
- [ ] B7 홈 요약 위젯 (이번 달 기록 수 / 연속 일수) — B1 이후
- [ ] B7 연속 일수 경계 assert 자체 점검 (어제까지 / 오늘 포함 / 빈 달)

## 항목마다 반복

- [ ] `npm run lint` → `npm run build` → 해당 verify → 라이트·다크 확인
