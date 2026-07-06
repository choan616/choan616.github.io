# GEMINI 프로젝트 규칙

## 📂 Planning 파일 관리
- 모든 planning 파일(`implementation_plan.md`, `task.md`, `work-history.md`)은 프로젝트 루트에 저장합니다.
- 구현 계획이나 task 내용을 업데이트할 때 기존 내용은 `work-history.md` 파일에 날짜별로 문서화하여 정리합니다.

## 🚫 Never 규칙 (즉시 중단)
- ❌ `secrets/`, `.env`, `appsettings.json`, `vendor/`, `node_modules/` 수정 금지
- ❌ API 키(`sk-`, `ghp-`), 비밀번호, DB 연결문자열 하드코딩 금지
- ❌ 위험 명령 금지 (`rm -rf`, `del /s`, `pip install`, `npm install` 등)
- ❌ 보안 취약점 금지 (SQL 인젝션, XSS 등)
- ❌ 개인정보 노출 금지 (이메일 `@`, 전화번호 등)

## ❓ Ask 규칙 (인간 승인 필수)
- 아키텍처 변경 (MVVM, SOLID 위반)
- 외부 의존성 추가 (NuGet, npm 패키지)
- 5개 이상 파일 동시 수정
- 프로덕션 환경 배포

## 📋 한국어 Plan-First 워크플로우
구현 계획 수립 시 항상 아래의 순서로 진행하며, 한국어로 작성합니다.
1. **구현 계획**: 변경 대상 파일, 작업 내용, 예상 영향, 테스트 전략
2. **진행 계획**: 단계별 작업 내용 및 예상 소요 시간
3. **승인 대기**: 사용자가 "OK" 또는 피드백을 주기 전까지 코드를 작성하지 않음
