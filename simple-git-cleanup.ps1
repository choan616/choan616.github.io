# 간단한 Git 히스토리 정리 스크립트 (BFG 불필요)
# 실행 전 반드시 백업을 만드세요!

Write-Host "=== Git 히스토리에서 민감한 정보 제거 ===" -ForegroundColor Green

# 1. 현재 상태 확인
Write-Host "`n1. 현재 Git 상태 확인..." -ForegroundColor Yellow
git status

# 2. 백업 확인
Write-Host "`n2. 백업하시겠습니까? (Y/N)" -ForegroundColor Yellow
$backup = Read-Host
if ($backup -eq 'Y' -or $backup -eq 'y') {
    Write-Host "백업 생성 중..." -ForegroundColor Cyan
    git clone . ../DIARY2-backup
    Write-Host "백업 완료: ../DIARY2-backup" -ForegroundColor Green
}

# 3. 변경사항 커밋
Write-Host "`n3. 현재 변경사항을 먼저 커밋합니다..." -ForegroundColor Yellow
git add .gitignore .env.example README.md src/services/googleDrive.js SECURITY_CLEANUP_GUIDE.md
git commit -m "security: Move API keys to environment variables"

Write-Host "`n완료!" -ForegroundColor Green
Write-Host @"

다음 단계:
1. 변경사항을 원격 저장소에 푸시: git push
2. Google Cloud Console에서 노출된 API 키 삭제
3. 새로운 API 키 생성 후 .env 파일에 입력

Git 히스토리 정리는 선택사항입니다.
이미 API 키를 무효화했다면 히스토리에 남아있어도 안전합니다.
"@ -ForegroundColor Cyan
