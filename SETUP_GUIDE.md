# 🖥️ 새 컴퓨터에서 프로젝트 실행하기

이 프로젝트를 다른 컴퓨터에서 실행하기 위한 단계별 가이드입니다.

## 1. 사전 준비

새 컴퓨터에 다음 프로그램들이 설치되어 있어야 합니다:
- **Node.js**: [다운로드 링크](https://nodejs.org/) (LTS 버전 권장)
- **Git**: [다운로드 링크](https://git-scm.com/)
- **VS Code** (권장 에디터): [다운로드 링크](https://code.visualstudio.com/)

## 2. 프로젝트 가져오기 (Clone)

터미널(또는 명령 프롬프트)을 열고 프로젝트를 저장할 폴더로 이동한 후 다음 명령어를 입력하세요:

```bash
# 프로젝트 복제
git clone https://github.com/choan616/choan616.github.io.git diary-app

# 폴더로 이동
cd diary-app
```

## 3. 라이브러리 설치

프로젝트 실행에 필요한 라이브러리들을 설치합니다:

```bash
npm install
```

## 4. 환경 변수 설정 (가장 중요! ⭐)

보안상 API 키가 포함된 `.env` 파일은 GitHub에 올라가지 않습니다. **직접 만들어야 합니다.**

1. 프로젝트 폴더에 `.env` 파일을 새로 만듭니다.
2. 아래 내용을 복사해서 붙여넣고, **본인의 실제 키**로 채워넣으세요.
   (이전 컴퓨터의 `.env` 파일 내용을 그대로 복사해오면 가장 좋습니다.)

```env
# .env 파일 내용
VITE_GOOGLE_CLIENT_ID=여기에_클라이언트_ID_입력
VITE_GOOGLE_API_KEY=여기에_API_키_입력
```

> **주의**: 값 앞뒤에 공백이 없어야 하며, 따옴표(`"`)를 쓰지 마세요.

## 5. 실행하기

### 개발 모드 실행 (코드 수정 시)
```bash
npm run dev
```
- 브라우저가 자동으로 열리지 않으면 `http://localhost:5173`으로 접속하세요.

### 배포용 빌드 및 미리보기
```bash
npm run build
npm run preview
```

## 6. 문제 해결

- **로그인이 안 돼요 (502 오류)**: `.env` 파일의 API 키가 정확한지 확인하세요.
- **화면이 하얗게 나와요**: `npm install`이 에러 없이 완료되었는지 확인하세요.
- **PWA 설치 버튼이 안 보여요**: 개발 모드(`npm run dev`)에서는 PWA 기능이 꺼져 있습니다. `npm run build` 후 `npm run preview`로 확인하세요.
