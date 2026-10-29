# 체크리스트

열려 있는 작업만 둔다. 끝난 항목은 지운다 (이력은 커밋에 있다).
계획과 배경은 `implementation_plan_design_v2.md`, 결정은 `decisions.md`, 세션 분배는 `handoff.md`.

## 축 A — 기존 요소 외형 개선 (구조·기능 변경 없음)

- [ ] A1 `index.css` 토큰 교체 (색·그림자·반경). `--glass-*`는 값만 평면화하고 변수는 남긴다
- [ ] A2 변수를 안 쓰고 직접 쓴 `backdrop-filter: blur(...)` 걷어내기
- [ ] A3 UI 고딕 / 본문 명조 분리. 본문 16.5px·행간 2.05·62자
- [ ] A4 `Icon.jsx`에 10개 추가 (search, calendar, photo, tag, lock, pencil, trash, plus, close, chevron-left/right)
- [ ] A4 UI 노출 이모지만 교체. 토스트 문구·`console.log`는 남긴다
- [ ] A5 카드·버튼·칩 스타일 (반경 칩 9999 / 버튼 10 / 카드 14 / 본문 16)
- [ ] A6 칩 넘침 방어 (`TagCloud.css`, `EntryEditor.css`)
- [ ] A7 `.day-has-entry` 점 표시로 교체
- [ ] A8 `.pwa-update-toast` 배경 `#2c3e50` → 토큰. `max-content`/`keep-all`은 유지
- [ ] 축 A 완료 후 라이트·다크 육안 리뷰 (여기서 멈춤)

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
