# 디자인 개선 구현 계획 (Design v2 — "종이와 잉크")

- 시안: https://claude.ai/artifact/3NxwypfH8FJDfmaVXtEhoM (비공개 Artifact, 아트보드 5장)
- 작성일: 2026-10-29
- 이 계획은 `implementation_plan_design_upgrade.md`(Ethereal Clarity / 글래스모피즘)를 대체한다.

## 컨셉

반투명·블러·메시 그라데이션을 걷어내고 **흰 면 + 1px 선**으로 층을 나눈다. 악센트는 잉크 인디고 `#38477A` 하나만 쓰고 상태색은 의미가 있을 때만 꺼낸다. UI는 고딕, 일기 본문은 명조로 분리한다. 이모지는 선형 SVG 아이콘으로 바꾼다.

글래스모피즘을 버리는 이유는 취향이 아니다. 일기는 긴 텍스트를 읽는 화면이고, 반투명 면 위의 글자는 배경에 따라 대비가 흔들린다. 다크 모드에서 특히 탁해진다.

## 두 축

| | 축 A — 기존 요소 외형 개선 | 축 B — 신규 기능 |
|---|---|---|
| 바꾸는 것 | CSS 토큰, 아이콘 | 컴포넌트 구조, DB, 레이아웃 |
| 건드리지 않는 것 | JSX 구조, 기능, DB | — |
| 되돌리기 | 커밋 단위로 쉽다 | 어렵다 |
| 사용자가 보는 변화 | 외형 전체 | 기능 추가 |

**축 A를 전부 끝내고 축 B로 간다.** 섞으면 "색이 이상한지 구조가 깨진 건지" 구분이 안 되고, 축 A만 되돌리는 것도 불가능해진다.

## 코드 확인 결과 (2026-10-29 기준)

계획의 공수 추정은 전부 아래 확인에서 나왔다. 추정이 아니다.

| 항목 | 현황 |
|---|---|
| `backdrop-filter` | 12개 파일에서 사용 (index.css 포함) |
| `--glass-*` 토큰 | 8개 파일에서 사용 |
| UI 이모지 | 14개 파일 44줄 (토스트 문구·로그 포함, 선별 필요) |
| `Icon.jsx` 보유 아이콘 | 12개 — backup, settings, logout, chevron-up/down, sync, check-circle, error, cloud-off, stats, sun, moon |
| 달력 작성일 표시 | `react-day-picker`의 `modifiersClassNames: { hasEntry: 'day-has-entry' }` — 이미 있다. CSS만 고치면 된다 |
| 일기 저장 | `EntryEditor.handleSave` 수동 저장. 자동 저장 없음 |
| 본문 입력칸 | `contentEditable="plaintext-only"` (iOS 연락처 자동완성 회피, 92e7381) |
| `StatsDashboard` 구성 | OnThisDay + WordCloud + 월별 Bar + 태그 Bar. **기간 선택 없음** |
| `ContributionHeatmap.jsx` | 존재하지만 **어디에서도 import 되지 않는다** (죽은 컴포넌트) |
| `OnThisDay.jsx` | `StatsDashboard` 안에만 있다. 메인 화면에는 없다 |
| `searchEntries(userId, query, ...)` | `query`가 없으면 `[]`를 반환한다. **필터 단독 사용 불가** |
| 태그 필터 | `allEntries`를 클라이언트에서 거른다 (`filteredEntriesByTag`). DB를 타지 않는다 |
| `images` 테이블 | `entries`와 분리. 인덱스 `++id, userId, entryDate, createdAt`. blob·thumbnail을 **base64 data URL**로 저장 |
| `ImageGallery` | 전체 이미지를 base64째로 메모리에 올린다 (`db.images.where({userId}).toArray()`). 기존 성능 문제 |
| 테스트 러너 | **없다.** `package.json` scripts는 dev / build / lint / preview |
| PWA 업데이트 감지·알림 | **이미 있다.** `registerType: 'prompt'` + `useRegisterSW` + 1시간 주기 `r.update()` + `visibilitychange` 재확인 + `.pwa-update-toast` 띠 + `controllerchange` 강제 새로고침 |
| 앱 버전 노출 | **없다.** `vite.config.js`에 주입 없고 `constants.js`에도 없고 설정 화면에도 표기가 없다. `package.json`의 `1.0.0`은 코드에서 쓰이지 않는다 |
| `.pwa-update-toast` | 배경이 `#2c3e50` 하드코딩. 토큰을 쓰지 않는다 (축 A 누락 지점) |

## 축 A — 기존 요소 외형 개선

구조·기능 변경 0. 전부 CSS와 아이콘이다.

**A1. 토큰 교체** — `src/index.css`의 `:root` / `.dark`
색·그림자·반경 변수를 시안 토큰으로 바꾼다. `--glass-*`, `--backdrop-blur`, `--bg-gradient`는 값만 평면 색으로 바꿔 두고 변수 자체는 남긴다(8개 파일이 참조 중이라 제거하면 한 번에 다 깨진다).
→ verify: `npm run build`, 라이트/다크 토글, 주요 화면 육안 확인

**A2. 블러 제거** — 12개 파일의 `backdrop-filter`
A1에서 `--backdrop-blur: none`으로 바꾸면 대부분 죽는다. 변수를 안 쓰고 직접 `backdrop-filter: blur(...)`를 쓴 곳만 걷어낸다.
→ verify: `grep -rn "backdrop-filter: blur" src` 가 0건

**A3. 타입 분리** — `src/index.css`, `src/services/uiSettings.js`
UI는 고딕 고정, 일기 본문만 사용자가 고른 글꼴(`AVAILABLE_FONTS`)을 받는다. 본문 스케일은 16.5px / 행간 2.05 / 최대 62자.
→ verify: 설정에서 글꼴을 바꿔도 버튼·라벨 글꼴은 그대로인지

**A4. 아이콘 교체** — `src/components/Icon.jsx` + 14개 파일
`Icon.jsx`에 10개를 추가한다: search, calendar, photo, tag, lock, pencil, trash, plus, close, chevron-left/right. 그다음 UI에 노출되는 이모지만 교체한다. **토스트 문구와 `console.log`의 이모지는 건드리지 않는다**(44줄 중 상당수가 이쪽이다).
→ verify: 화면에 이모지가 남아 있지 않은지 육안 확인, `npm run lint`

**A5. 카드·버튼·칩 스타일** — 각 컴포넌트 CSS
1px 선 + 흰 면. 반경은 칩 9999 / 버튼 10 / 카드 14 / 본문 16.
→ verify: 육안

**A6. 칩 넘침 방어** — `TagCloud.css`, `EntryEditor.css`
담는 줄은 `flex-wrap: wrap`, 칩은 `max-width` + 말줄임, 지우기 버튼은 `flex-shrink: 0`. 시안 리뷰에서 나온 지적이다.
→ verify: 20자 태그를 넣고 사이드바·작성 화면에서 넘치지 않는지

**A7. 달력 점 표시** — `Calendar.css`의 `.day-has-entry`
JSX 무변경. 현재 스타일을 시안의 점 표시로 바꾼다.
→ verify: 일기 있는 날에만 점이 찍히는지

**A8. 업데이트 띠 토큰화** — `src/App.css`의 `.pwa-update-toast`
배경 `#2c3e50` 하드코딩을 토큰으로 바꾼다. **`width: max-content`와 `word-break: keep-all`은 건드리지 않는다** — 6be3d3b에서 좁은 화면에서 글자 단위로 꺾이던 걸 막은 코드다.
→ verify: 320px 폭에서 띠가 글자 단위로 꺾이지 않는지, 라이트·다크 양쪽

## 축 B — 신규 기능

시안에만 있고 코드에는 없는 것들. B0이 최우선이고 나머지는 싼 것부터 쓴다.

**B0. 버전 가시화 — 축 B 최우선**
감지와 알림 자체는 이미 동작한다(위 표). 없는 것은 **지금 쓰는 버전이 몇인지 알 길**이다. 그래서 "새로고침했는데 정말 새 버전으로 바뀐 건가"를 확인할 수 없고, 띠가 떠도 그 말을 믿을 근거가 없다. 알림 기능을 새로 만드는 게 아니라 **이미 있는 알림을 신뢰할 수 있게 만드는 작업**이다.
- B0-1 빌드 시 버전 주입 — `vite.config.js`의 `define`에 `__APP_VERSION__`과 빌드 시각. `src/constants.js`에서 꺼내 쓴다
- B0-2 버전 표시 + 수동 확인 — 설정(B1 이후에는 더보기)에 현재 버전과 "업데이트 확인" 버튼. 버튼은 등록 객체의 `update()`를 부른다
- 손대는 곳: `vite.config.js`, `src/constants.js`, `src/App.jsx`, `src/components/Settings.jsx`
- → verify: 빌드 후 설정에 `package.json`의 버전이 뜨는지. 버전을 올려 두 번 빌드한 뒤 `npm run preview`로 띠가 뜨고, 새로고침하면 표시 버전이 바뀌는지
- 주의: `onRegisteredSW(_url, r)`의 등록 객체 `r`이 지금은 콜백 안에만 살아 있다. 설정 화면에서 쓰려면 ref나 상태로 끌어올려야 한다
- 축 A와 파일이 겹치지 않는다(겹치는 건 `Settings.jsx`의 A5 스타일 정도). **축 A보다 먼저 해도 된다**
- 시안에 이 UI가 없다. 띠는 A8 스타일을 따르고, 설정의 버전 행은 기존 설정 행 스타일을 쓴다

**B4. 히트맵 되살리기** — 거의 공짜
`ContributionHeatmap.jsx`가 이미 있고 아무도 안 쓴다. `StatsDashboard`에 import 하고 시안 스타일(5단계 명도)로 맞춘다.
- 손대는 곳: `StatsDashboard.jsx`, `ContributionHeatmap.css`
- → verify: 통계 화면에 히트맵이 뜨고, 기록 없는 날이 빈 칸인지

**B5. "작년 오늘" 메인 노출** — 배치만 변경
`OnThisDay`를 메인 화면 하단에도 둔다. 컴포넌트는 그대로 재사용한다.
- 손대는 곳: `App.jsx`(main 영역), `OnThisDay.css`
- → verify: 작년 같은 날 일기가 있을 때만 뜨는지, 없으면 빈 카드가 남지 않는지

**B8. 사진 개수 표시** — "사진 모아보기 214장"
`db.images.where({ userId }).count()`는 레코드를 읽지 않아 싸다. 단 `deletedAt`을 걸러내려면 전체를 읽어야 하므로, **삭제분을 포함한 대략치**로 둔다.
- 손대는 곳: `db/adapter.js`(`countImages`), `App.jsx`
- → verify: 사진 5장 추가 후 숫자가 5 늘어나는지
- 주의: `and(i => !i.deletedAt)`를 붙이면 base64 전체를 메모리에 올린다. 붙이지 않는다

**B3. 통계 기간 선택** — 올해 / 이번 달 / 전체
`StatsDashboard`가 받는 `entries`를 기간으로 거르고 나머지 위젯에 넘긴다. DB 변경 없음.
- 손대는 곳: `StatsDashboard.jsx`, `StatsDashboard.css`
- → verify: 기간을 바꾸면 월별 차트·태그 빈도·히트맵이 함께 바뀌는지

**B2. 자동 저장**
`isEditing` 중 `formData` 변경을 디바운스(2~3초)해 `onSave`를 호출한다. 저장 상태를 헤더에 표시한다.
- 손대는 곳: `EntryEditor.jsx`
- → verify: 입력 후 3초 뒤 새로고침해도 내용이 남는지. 이미지 업로드 중 자동 저장이 겹치지 않는지
- 주의: `onSave`가 이미지 업로드까지 처리한다. 디바운스가 업로드를 중복 트리거하지 않게 본문·태그 변경만 자동 저장 대상으로 잡는다. **이 축에서 가장 데이터를 깨뜨리기 쉬운 항목이다**

**B6. "사진 있는 날" 필터**
`searchEntries`는 `query` 없이는 `[]`이므로 건드리지 않는다. 태그 필터와 같은 클라이언트 측 경로를 재사용한다.
- 선행: 사진 있는 날짜 목록이 필요하다. 지금 인덱스로는 전체 blob을 읽어야 하므로 **스키마 v11에 복합 인덱스 `[userId+entryDate]`를 추가**하고 `uniqueKeys()`로 날짜만 뽑는다. 인덱스 추가라 데이터 마이그레이션은 없다
- 손대는 곳: `db/db.js`(v11), `db/adapter.js`(`getImageEntryDates`), `App.jsx`, `Search.jsx`
- → verify: 사진 있는 일기만 목록에 나오는지. 사진 200장 환경에서 메모리 사용량이 튀지 않는지(DevTools)

**B1. 모바일 하단 탭 + 쓰기 버튼** — 가장 큰 변경, 마지막
`Layout.jsx`의 햄버거 + 서랍 구조를 하단 탭 4개(일기·사진·통계·더보기) + FAB으로 바꾼다. 사이드바에 들어 있던 검색·달력·태그의 자리를 다시 정해야 한다.
- 손대는 곳: `Layout.jsx`, `Layout.css`, `App.jsx`(sidebar/main 분기), `UserProfileButton`(더보기로 흡수)
- → verify: iOS 홈 화면 앱에서 하단 탭이 홈 인디케이터에 가리지 않는지(`env(safe-area-inset-bottom)`), 데스크톱 레이아웃이 그대로인지, 서랍 관련 상태(`sidebarOpen`)의 잔재가 없는지
- 주의: 데스크톱은 2단 레이아웃을 유지한다. 브레이크포인트로 갈라야 한다

**B7. 홈 요약 위젯** — 이번 달 기록 수 / 연속 일수
`entriesDateList`로 계산 가능하다. DB 변경 없음. 다만 자리가 B1의 모바일 홈이라 **B1 이후**다.
- 손대는 곳: 새 컴포넌트 1개, `App.jsx`
- → verify: 연속 일수 계산에 대한 자체 점검(어제까지 연속 / 오늘 포함 / 빈 달 경계)

## 순서와 커밋 경계

커밋 하나 = 위 항목 하나.

```
S0  토큰 추출 (design-tokens.md)        ← 이후 세션이 Artifact를 읽지 않아도 되게 한다
B0  버전 가시화                          ← 축 A와 파일이 겹치지 않는다
A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8   (축 A 완료, 여기서 멈춰 육안 리뷰)
B4 → B5 → B8 → B3 → B2 → B6 → B1 → B7
```

축 A가 끝난 시점이 되돌릴 수 있는 안전지대다. 축 B는 여기서부터 각자 독립적으로 되돌릴 수 있게 유지한다.

세션을 나눠 진행하는 방법과 각 세션에 넣을 지시는 `handoff.md`에 있다.

## 검증 수단

테스트 러너가 없다. 항목마다 아래를 돌린다.

1. `npm run lint`
2. `npm run build`
3. 해당 항목의 verify (위에 각각 적어둠)
4. 라이트·다크 양쪽 확인 (축 A 전 항목)

B2(자동 저장)와 B7(연속 일수)은 로직이라 눈으로는 부족하다. 두 항목은 assert 기반 자체 점검 스크립트를 함께 남긴다. 테스트 러너 도입은 이 계획 범위 밖이다.

## 리스크

- **B2 자동 저장**이 가장 위험하다. `onSave`가 이미지 업로드까지 맡고 있어서, 디바운스를 잘못 걸면 업로드를 중복 호출하거나 저장 중 상태를 덮어쓴다.
- **B1 하단 탭**은 `Layout.jsx` 구조 교체라 축 A의 CSS 작업과 충돌 지점이 많다. 그래서 마지막이다.
- **B6 스키마 v11**은 인덱스 추가지만 Dexie 버전을 올리는 일이다. 여러 탭을 열어 둔 상태의 업그레이드 처리(`db.js`에 이미 있음)를 확인해야 한다.
- `ImageGallery`가 전체 이미지를 base64로 올리는 **기존** 성능 문제는 이 계획 범위가 아니다. B6에서 인덱스가 생기면 같이 고칠 여지가 생긴다.
