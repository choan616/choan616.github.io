# Git 히스토리 및 API 키 보안 조치 가이드

## 🚨 즉시 수행해야 할 작업

### 1단계: 노출된 API 키 무효화 (최우선)

> **⚠️ CRITICAL**: 코드 수정만으로는 이미 노출된 API 키를 보호할 수 없습니다. 반드시 API 키를 무효화하고 새로 생성해야 합니다.

#### Google Cloud Console에서 키 무효화:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보** 메뉴
4. 노출된 자격증명 찾기:
   - **Client ID**: `291869999860-jl8tklpp3h58o7qlmmkmsovalqefvueo.apps.googleusercontent.com`
   - **API Key**: `AIzaSyApBer_mDso-nKCeMfljPwUNDQ_tNnIxk0`
5. 각 자격증명의 **삭제** 또는 **비활성화** 버튼 클릭

---

### 2단계: 새로운 API 키 생성

#### OAuth 2.0 Client ID 생성:

1. **사용자 인증 정보 만들기** → **OAuth 2.0 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션**
3. **승인된 JavaScript 원본** 추가:
   ```
   http://localhost:5173
   http://localhost:4173
   https://your-production-domain.com  (배포 시)
   ```
4. 생성된 **클라이언트 ID** 복사

#### API 키 생성:

1. **사용자 인증 정보 만들기** → **API 키**
2. **키 제한** 설정 (권장):
   - **API 제한**: Google Drive API만 선택
   - **애플리케이션 제한**: HTTP 리퍼러
     ```
     http://localhost:5173/*
     http://localhost:4173/*
     https://your-production-domain.com/*
     ```
3. 생성된 **API 키** 복사

---

### 3단계: .env 파일에 새 키 입력

`f:\LAB\DIARY2\.env` 파일을 열어 새로 생성한 키로 교체:

```env
VITE_GOOGLE_CLIENT_ID=새로생성한클라이언트ID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=새로생성한API키
```

---

## 🧹 Git 히스토리 정리 (선택사항, 권장)

API 키가 Git 히스토리에 남아있으므로, 완전한 보안을 위해 히스토리에서 제거하는 것이 좋습니다.

### 방법 1: BFG Repo-Cleaner 사용 (권장)

가장 빠르고 안전한 방법입니다.

#### 설치:

```powershell
# Chocolatey 사용 (Windows)
choco install bfg-repo-cleaner

# 또는 직접 다운로드
# https://rtyley.github.io/bfg-repo-cleaner/
```

#### 사용법:

```powershell
cd f:\LAB\DIARY2

# 1. 백업 생성 (필수!)
git clone --mirror . ../DIARY2-backup

# 2. 민감한 문자열이 포함된 파일 생성
echo "AIzaSyApBer_mDso-nKCeMfljPwUNDQ_tNnIxk0" > secrets.txt
echo "291869999860-jl8tklpp3h58o7qlmmkmsovalqefvueo" >> secrets.txt

# 3. BFG로 히스토리에서 제거
bfg --replace-text secrets.txt .

# 4. Git reflog와 garbage collection 실행
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 원격 저장소에 강제 푸시 (매우 신중하게!)
git push --force --all
git push --force --tags

# 6. secrets.txt 삭제
rm secrets.txt
```

### 방법 2: git filter-repo 사용 (고급)

더 세밀한 제어가 필요할 때 사용합니다.

#### 설치:

```powershell
pip install git-filter-repo
```

#### 사용법:

```powershell
cd f:\LAB\DIARY2

# 1. 백업 생성 (필수!)
git clone . ../DIARY2-backup

# 2. 특정 문자열을 히스토리에서 제거
git filter-repo --replace-text <(echo "AIzaSyApBer_mDso-nKCeMfljPwUNDQ_tNnIxk0==>***REMOVED***")
git filter-repo --replace-text <(echo "291869999860-jl8tklpp3h58o7qlmmkmsovalqefvueo==>***REMOVED***")

# 3. 원격 저장소 재설정 및 강제 푸시
git remote add origin <your-repo-url>
git push --force --all
git push --force --tags
```

### 방법 3: GitHub에서 캐시 정리 요청 (GitHub 사용 시)

GitHub는 히스토리를 캐싱하므로, 강제 푸시 후에도 캐시에 남아있을 수 있습니다.

1. [GitHub Support](https://support.github.com/contact)에 문의
2. 제목: "Request to Purge Cached Sensitive Data"
3. 내용:
   ```
   Repository: [your-repo-url]
   Reason: Accidentally committed API keys
   Commits affected: All commits in branch [branch-name]
   
   I have already removed the sensitive data from the repository history 
   using git filter-repo/BFG and force-pushed. Please purge the cached 
   data from GitHub's servers.
   ```

---

## ⚠️ 주의사항

### Git 히스토리 정리 시 주의할 점:

1. **팀 협업 중이라면**: 모든 팀원에게 알리고 조율 필요
   - 다른 팀원은 저장소를 다시 클론해야 함
   - 기존 로컬 브랜치는 충돌 발생 가능

2. **Force Push의 위험성**:
   ```
   git push --force
   ```
   - 원격 저장소를 강제로 덮어씀
   - 다른 사람의 작업이 손실될 수 있음
   - 반드시 혼자 작업하는 저장소에서만 수행

3. **백업 필수**:
   - 히스토리 정리 전에 반드시 백업 생성
   - 잘못되면 복구 불가능

---

## ✅ 검증 방법

### 1. API 키가 코드에서 제거되었는지 확인:

```powershell
cd f:\LAB\DIARY2

# 현재 코드에서 검색 (결과 없어야 함)
grep -r "AIzaSy" src/

# Git 히스토리 전체에서 검색 (정리 후 결과 없어야 함)
git log -S "AIzaSy" --all --oneline
```

### 2. .env 파일이 Git에서 무시되는지 확인:

```powershell
git status

# .env 파일이 "Untracked files"에 나타나지 않아야 함
```

### 3. 새로운 환경 변수로 앱이 작동하는지 확인:

```powershell
npm run dev

# 브라우저에서 Google Drive 백업 기능 테스트
```

---

## 📋 체크리스트

코드 수정 완료 후 아래 항목을 순서대로 수행하세요:

- [ ] **즉시**: Google Cloud Console에서 노출된 API 키 삭제/비활성화
- [ ] **즉시**: 새로운 OAuth Client ID 생성
- [ ] **즉시**: 새로운 API 키 생성 (제한 설정 포함)
- [ ] `.env` 파일에 새 키 입력
- [ ] 개발 서버에서 백업 기능 테스트
- [ ] Git 히스토리 정리 (선택, 권장):
  - [ ] 저장소 백업 생성
  - [ ] BFG 또는 git filter-repo로 민감한 데이터 제거
  - [ ] Force push 수행
  - [ ] GitHub 캐시 정리 요청 (GitHub 사용 시)
- [ ] 팀원들에게 알림 (협업 중인 경우)
- [ ] 검증 명령어로 완전 제거 확인

---

## 🔐 향후 보안 수칙

1. **절대 하지 말 것**:
   - ❌ API 키를 코드에 직접 작성
   - ❌ `.env` 파일을 Git에 커밋
   - ❌ 공개 저장소에 민감한 정보 포함

2. **반드시 할 것**:
   - ✅ 환경 변수 사용 (`.env` 파일)
   - ✅ `.gitignore`에 `.env` 추가
   - ✅ `.env.example` 템플릿 제공
   - ✅ API 키에 제한 설정 (IP, 도메인, API 범위)
   - ✅ 주기적으로 키 로테이션 (3-6개월)

3. **추가 보안 강화**:
   - Pre-commit hook 설정하여 민감한 정보 커밋 방지
   - Secret scanning 도구 사용 (예: git-secrets, detect-secrets)
   - Google Cloud Console에서 API 사용량 모니터링

---

## 📚 추가 리소스

- [BFG Repo-Cleaner 공식 문서](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo 가이드](https://github.com/newren/git-filter-repo)
- [GitHub - Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Google API 보안 모범 사례](https://cloud.google.com/docs/authentication/api-keys)

---

**작업을 시작하기 전에 반드시 백업을 생성하세요! 🔒**
