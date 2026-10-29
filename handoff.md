# 세션 핸드오프

디자인 v2를 세션을 나눠 진행하기 위한 지시서. 작업 내용은 `implementation_plan_design_v2.md`에 있고, 이 문서는 **누가 어느 순서로 무엇을 들고 시작하는지**만 정한다.

## 모든 세션이 시작할 때 읽을 것

```
1. implementation_plan_design_v2.md   ← 범위·순서·항목별 verify
2. decisions.md                        ← 기각한 대안이 여기 있다. 읽지 않으면 이미 버린 안을 다시 들고 온다
3. checklist.md                        ← 남은 작업
4. context-notes.md                    ← 왜 그렇게 정했는지 (필요할 때만)
```

## 모든 세션 공통 규칙

- **항목 하나 = 커밋 하나.** A1과 A2를 한 커밋에 섞지 않는다.
- 커밋 전에 `npm run lint` → `npm run build`. 테스트 러너는 없다.
- 계획에 적힌 해당 항목의 verify를 직접 수행한다. 빌드 통과는 verify가 아니다.
- 끝난 항목은 `checklist.md`에서 **지운다**. 체크만 하고 남기지 않는다.
- 결정을 바꿨으면 `decisions.md`의 해당 줄 상태를 같은 커밋에서 바꾼다. 줄을 지우지 않는다.
- 계획에 없는 것을 발견하면 **그 자리에서 고치지 말고** `checklist.md`에 적고 보고한다.

## 진행 순서와 모델 배정

| 세션 | 작업 | 모델 | 이유 |
|---|---|---|---|
| S0 | 토큰 추출 → `design-tokens.md` | Sonnet 5.5 | 값을 옮기는 일. 판단 없음 |
| S1 | B0 버전 가시화 | Sonnet 5.5 | 파일 4개, 범위 명확 |
| S2 | A1 토큰 교체 | 상위 모델 | 전체 외형의 기준점. 여기서 틀어지면 A2~A8이 다 틀어진다 |
| S3 | A2 → A8 순차 | Sonnet 5.5 | 치환 작업. grep으로 검증된다 |
| — | **육안 리뷰 (사람)** | — | 라이트·다크 양쪽. 여기가 안전지대 |
| S4 | B4 → B5 → B8 → B3 | Sonnet 5.5 | 파일이 거의 안 겹치고 기능이 단순 |
| S5 | B2, B6 | 상위 모델 | B2는 데이터를 깨뜨릴 수 있고 B6은 스키마를 올린다 |
| S6 | B1, B7 | 상위 모델 | `Layout.jsx` 구조 교체 |

한 세션에서 여러 항목을 할 때도 **항목 사이에 커밋을 넣는다.** 중간에 멈춰도 되돌릴 수 있어야 한다.

---

## S0 — 토큰 추출 (지금 할 일)

**목표**: 시안의 실제 값을 repo로 옮겨, 이후 세션이 Artifact를 읽지 않아도 축 A를 할 수 있게 한다.

**산출물**: `design-tokens.md` 하나. 코드는 건드리지 않는다.

시안 Artifact: `https://claude.ai/artifact/3NxwypfH8FJDfmaVXtEhoM` (비공개)
값이 들어 있는 아트보드: `project/Tokens.dc.html`

세션 시작 프롬프트로 아래를 그대로 넣는다.

```
Mmtm 저장소에서 작업한다. 먼저 implementation_plan_design_v2.md, decisions.md,
checklist.md 를 읽어라.

할 일은 S0 하나다. 디자인 시안 Artifact 에서 토큰 값을 추출해
design-tokens.md 로 저장한다. 코드는 한 줄도 바꾸지 않는다.

Artifact 읽기:
  Artifact 도구, action "read",
  url  = https://claude.ai/artifact/3NxwypfH8FJDfmaVXtEhoM
  path = project/Tokens.dc.html

그 파일의 renderVals() 안에 colors / dark / dayStates 배열이 있고, 마크업에
타입 스케일과 반경·칩 규칙이 들어 있다. 거기 적힌 값을 그대로 옮긴다.
값을 보정하거나 예쁘게 다듬지 마라. 시안이 기준이다.

design-tokens.md 에 담을 것:
  - 라이트 색 10종 (이름 / hex / 용도)
  - 다크 색 5종
  - 타입 스케일: UI(고딕) 5단, 본문(명조) 1단 — 크기·굵기·용도
  - 반경: 칩 9999 / 버튼 10 / 카드 14 / 본문 16
  - 칩 규칙: 담는 줄 flex-wrap, 칩 max-width + 말줄임, 지우기 버튼 flex-shrink 0, 넘침은 +N
  - 각 값을 index.css 의 어느 변수에 넣을지 대응표

검증: 추출한 색 개수가 라이트 10 / 다크 5 인지, hex 가 6자리인지 직접 확인.
커밋: "시안 토큰을 design-tokens.md 로 추출" 한 건.

Artifact 도구를 쓸 수 없으면 거기서 멈추고 보고하라. 값을 추측해서 채우지 마라.
```

**Artifact 도구가 없는 세션이면** S0은 불가능하다. 추측으로 채우면 이후 전부가 어긋나므로, 그 경우 시안을 만든 세션에서 추출한다.

---

## S1 — B0 버전 가시화

```
Mmtm 저장소에서 작업한다. implementation_plan_design_v2.md, decisions.md,
checklist.md 를 먼저 읽어라.

할 일은 B0 하나다. 계획의 "B0. 버전 가시화" 항목을 그대로 수행한다.

중요한 전제 — 업데이트 감지와 알림은 이미 동작한다. 새로 만들지 마라.
vite.config.js 의 registerType: 'prompt' 와 App.jsx 의 useRegisterSW,
.pwa-update-toast 띠, controllerchange 강제 새로고침이 이미 있다.
없는 것은 "지금 쓰는 버전이 몇인지" 뿐이다. 그것만 추가한다.

B0-1 과 B0-2 를 각각 커밋한다. App.css 의 .pwa-update-toast 스타일은
A8 의 몫이니 여기서 건드리지 마라.

onRegisteredSW(_url, r) 의 r 이 콜백 안에만 살아 있다. 설정 화면에서 쓰려면
끌어올려야 하는데, 끌어올리는 방식은 기존 코드 스타일에 맞춰라.

검증: 빌드 후 설정에 package.json 의 버전이 뜨는지. package.json 버전을 올려
두 번 빌드하고 npm run preview 로 띠가 뜨는지, 새로고침 후 표시 버전이 바뀌는지.
```

---

## S2 — A1 토큰 교체 (상위 모델)

```
Mmtm 저장소에서 작업한다. implementation_plan_design_v2.md, decisions.md,
design-tokens.md 를 먼저 읽어라.

할 일은 A1 하나다. src/index.css 의 :root 와 .dark 를 design-tokens.md 의
값으로 교체한다.

--glass-bg, --glass-border, --glass-shadow, --backdrop-blur, --bg-gradient 는
변수를 제거하지 말고 값만 평면 색으로 바꾼다 (D4). 8개 파일이 참조 중이라
제거하면 한 커밋에서 전부 깨진다.

A2 이후는 다음 세션의 몫이다. index.css 외의 파일은 건드리지 마라.

검증: npm run build. 라이트·다크 토글. 메인·작성·통계·설정 화면 육안 확인.
이 커밋이 이후 전부의 기준점이다. 색이 하나라도 시안과 다르면 여기서 잡는다.
```

---

## S3 — A2 ~ A8 순차

```
Mmtm 저장소에서 작업한다. implementation_plan_design_v2.md, decisions.md,
design-tokens.md, checklist.md 를 먼저 읽어라.

A2 부터 A8 까지 순서대로 한다. 항목마다 커밋하고, 항목마다 계획에 적힌
verify 를 수행한다. 축 B 항목은 손대지 않는다.

주의할 것:
  A2 — 변수를 쓰지 않고 직접 쓴 backdrop-filter: blur(...) 만 걷어낸다.
       끝났으면 grep -rn "backdrop-filter: blur" src 가 0건이어야 한다.
  A4 — UI 에 노출되는 이모지만 교체한다. 토스트 문구와 console.log 의
       이모지는 남긴다 (D5). 14개 파일 44줄 중 상당수가 로그 쪽이다.
  A7 — Calendar.jsx 는 건드리지 않는다. .day-has-entry CSS 만 고친다 (D6).
  A8 — .pwa-update-toast 의 width: max-content 와 word-break: keep-all 은
       건드리지 않는다. 6be3d3b 에서 좁은 화면 줄바꿈을 막은 코드다.

A8 까지 끝나면 멈추고 보고하라. 사람이 육안 리뷰할 지점이다.
```

---

## S4 이후

`implementation_plan_design_v2.md`의 축 B 항목을 순서대로 따른다. S4(B4·B5·B8·B3)는 Sonnet, S5(B2·B6)와 S6(B1·B7)은 상위 모델. 각 항목의 "주의" 줄을 반드시 읽는다. B2와 B6은 되돌리기 어렵다.
