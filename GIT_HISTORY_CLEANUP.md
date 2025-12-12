# Git 히스토리 정리 가이드

## ⚠️ 중요: 이 작업은 되돌릴 수 없습니다!

Git 히스토리에서 민감한 정보를 완전히 제거하려면 Git 히스토리를 재작성해야 합니다.
이 작업은 **force push**가 필요하므로 신중히 진행하세요.

## 🔴 먼저 해야 할 일

1. **Google Cloud Console에서 노출된 키를 삭제/폐기**
   - API 키: `AIzaSyAvvwekQQpcErP_5tQFARRkHwMDqZuzqLg`
   - OAuth Client ID: `291869999860-p6m8kirvc65vner0478mkepd5rebtnll.apps.googleusercontent.com`
   - 새로운 키를 생성하고 `.env` 파일에 저장

2. **새 키가 절대 커밋되지 않도록 확인**
   - `.gitignore`에 `.env`가 포함되어 있는지 확인 ✅ (이미 완료)
   - `.gitignore`에 `dist`와 `assets`가 포함되어 있는지 확인 ✅ (이미 완료)

## 방법 1: BFG Repo-Cleaner 사용 (권장)

BFG는 Git 히스토리에서 민감한 정보를 제거하는 가장 빠르고 쉬운 도구입니다.

### 1단계: BFG 다운로드

```powershell
# Chocolatey를 사용하는 경우
choco install bfg

# 또는 직접 다운로드
# https://rtyley.github.io/bfg-repo-cleaner/
# bfg.jar 파일을 다운로드하세요
```

### 2단계: 노출된 키 목록 파일 생성

`secrets.txt` 파일을 생성하고 노출된 키들을 나열:

```
AIzaSyApBer_mDso-nKCeMfljPwUNDQ_tNnIxk0
AIzaSyAvvwekQQpcErP_5tQFARRkHwMDqZuzqLg
291869999860-p6m8kirvc65vner0478mkepd5rebtnll.apps.googleusercontent.com
```

### 3단계: BFG 실행

```powershell
# 리포지토리의 백업 생성
cd f:\LAB
git clone --mirror https://github.com/choan616/choan616.github.io.git diary2-backup.git

# BFG로 비밀 제거
java -jar bfg.jar --replace-text secrets.txt diary2-backup.git

# 변경사항 적용
cd diary2-backup.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# GitHub에 강제 푸시
git push --force
```

### 4단계: 로컬 리포지토리 재클론

```powershell
cd f:\LAB
# 기존 폴더 백업
mv DIARY2 DIARY2_old

# 새로 클론
git clone https://github.com/choan616/choan616.github.io.git DIARY2

# .env 파일 복원 (새 키 사용!)
# DIARY2_old\.env를 참고하되, 새로 생성한 키를 사용하세요
```

## 방법 2: git filter-repo 사용

### 1단계: git-filter-repo 설치

```powershell
pip install git-filter-repo
```

### 2단계: 특정 파일 제거

```powershell
cd f:\LAB\DIARY2

# dist와 assets 폴더를 히스토리에서 완전히 제거
git filter-repo --path dist --path assets --invert-paths

# GitHub에 강제 푸시
git push origin --force --all
```

## 방법 3: 새 리포지토리 생성 (가장 간단)

민감한 정보가 많이 노출되었다면, 새 리포지토리를 생성하는 것이 가장 안전합니다:

### 1단계: GitHub에서 새 리포지토리 생성

1. https://github.com/new 접속
2. 새 리포지토리 이름 입력 (예: `choan616.github.io-v2`)
3. **Private**로 생성 (또는 Public)

### 2단계: 로컬에서 새 리포지토리로 푸시

```powershell
cd f:\LAB\DIARY2

# 기존 리모트 제거
git remote remove origin

# 새 리포지토리 추가
git remote add origin https://github.com/choan616/새리포지토리이름.git

# .env 파일이 제외되었는지 확인
git status

# 현재 상태를 새 리포지토리로 푸시
git push -u origin main
```

### 3단계: 기존 리포지토리 삭제

1. https://github.com/choan616/choan616.github.io 접속
2. **Settings** → 가장 아래로 스크롤
3. **Delete this repository** 클릭
4. 확인 절차 완료

## ✅ 완료 후 확인사항

- [ ] Google Cloud Console에서 노출된 키가 삭제/비활성화되었는지 확인
- [ ] 새 키가 `.env` 파일에만 있고 Git에 커밋되지 않았는지 확인
- [ ] GitHub 리포지토리에서 `dist/` 및 `assets/` 폴더가 보이지 않는지 확인
- [ ] 애플리케이션이 새 키로 정상 작동하는지 테스트

## 🔐 앞으로 주의할 점

1. **절대로 빌드 파일(`dist/`, `assets/`)을 커밋하지 마세요**
2. **GitHub Pages 배포는 GitHub Actions를 사용하세요** (별도 설정 필요)
3. **`.env` 파일은 절대 커밋하지 마세요**
4. **환경 변수는 GitHub Secrets에 등록하고 Actions에서 사용하세요**

## 📚 추가 리소스

- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
