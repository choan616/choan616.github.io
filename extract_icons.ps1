# Icon Extractor Script
# This script reads the textarea values from the already-open browser page
# and saves them as PNG files

# Wait for user to reload the page if needed
Write-Host "Please ensure gen_icon.html is loaded in your browser and showing the icons."
Write-Host "Press Enter when ready to extract Base64 from the textareas..."
Read-Host

# Manual extraction: User will copy the Base64 strings
Write-Host ""
Write-Host "==================================="
Write-Host "MANUAL EXTRACTION REQUIRED"
Write-Host "==================================="
Write-Host ""
Write-Host "Please follow these steps:"
Write-Host "1. In your browser (file:///F:/LAB/DIARY2/public/gen_icon.html)"
Write-Host "2. Copy the content of the FIRST textarea (192x192 icon)"
Write-Host "3. Paste it below and press Enter:"
Write-Host ""

$base64_192 = Read-Host "Base64 for 192x192"

Write-Host ""
Write-Host "4. Now copy the content of the SECOND textarea (512x512 icon)"
Write-Host "5. Paste it below and press Enter:"
Write-Host ""

$base64_512 = Read-Host "Base64 for 512x512"

# Remove data URL prefix if present
$base64_192 = $base64_192 -replace '^data:image/png;base64,', ''
$base64_512 = $base64_512 -replace '^data:image/png;base64,', ''

# Convert Base64 to bytes and save
$bytes192 = [Convert]::FromBase64String($base64_192)
$bytes512 = [Convert]::FromBase64String($base64_512)

[System.IO.File]::WriteAllBytes("f:\LAB\DIARY2\public\icon-192x192.png", $bytes192)
[System.IO.File]::WriteAllBytes("f:\LAB\DIARY2\public\icon-512x512.png", $bytes512)

Write-Host ""
Write-Host "==================================="
Write-Host "SUCCESS!"
Write-Host "==================================="
Write-Host "Icons saved to:"
Write-Host "  - f:\LAB\DIARY2\public\icon-192x192.png"
Write-Host "  - f:\LAB\DIARY2\public\icon-512x512.png"
Write-Host ""
Write-Host "You can now refresh your app (Ctrl+Shift+R) to see the new icons!"
