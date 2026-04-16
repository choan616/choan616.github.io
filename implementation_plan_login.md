# 구글 로그인 UX 개선 계획

## 목표 (Goal)
사용자가 직접 API Key를 발급받아야 하는 번거로움을 제거합니다. `GoogleDriveService`를 **Client ID만으로 작동하도록** 단순화하여 로그인 진입 장벽을 낮춥니다.

## 사용자 검토 필요 (User Review Required)
> [!IMPORTANT]
> 앱 작동을 위해서는 여전히 **Client ID**가 필요합니다. 
> 현재 단계에서는 기존처럼 `.env` 파일에서 `CLIENT_ID`를 읽어오되, `API_KEY`는 없어도 되도록 수정합니다. 
> 향후 정식 상용화 배포 시에는 개발자(귀하)의 Client ID를 코드에 직접 하드코딩하여 사용자는 아무 설정 없이 로그인하게 됩니다.

## 제안된 변경 사항 (Proposed Changes)

### `src/services/cloudStorage/GoogleDriveService.js`

1.  **API Key를 선택 사항으로 변경**:
    - `if (!CLIENT_ID || !API_KEY)` 와 같은 엄격한 체크를 제거합니다.
    - 오직 `CLIENT_ID`의 존재 여부만 확인합니다.
2.  **`initGapiClient` 수정**:
    - `gapi.client.init` 설정에서 `apiKey` 필드를 조건부로 넣거나 제거합니다.
    - `API_KEY`가 없어도 초기화를 진행합니다. (GIS를 통해 받은 Access Token으로 Drive API 사용이 충분히 가능합니다.)
3.  **에러 처리 개선**:
    - `CLIENT_ID`가 없을 때만 콘솔에 경고 메시지를 띄웁니다. `API_KEY` 누락으로 인한 에러는 발생시키지 않습니다.

## 검증 계획 (Verification Plan)
1.  **수동 테스트**:
    - 임시로 `.env` 파일에서 `VITE_GOOGLE_API_KEY`를 제거합니다.
    - 앱을 재시작하고 로그인을 시도합니다.
    - 파일 목록 조회 및 업로드가 정상적으로 작동하는지(Access Token 기반) 확인합니다.
