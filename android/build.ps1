# Build aplikasi NEXBILL Android (Trusted Web Activity) di Windows.
# Jalankan dari folder ini:  powershell -ExecutionPolicy Bypass -File .\build.ps1
# Panduan lengkap: README-PLAYSTORE.md
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js belum terpasang. Pasang Node 18+ dari https://nodejs.org lalu ulangi." }
if (-not (Get-Command bubblewrap -ErrorAction SilentlyContinue)) {
  Write-Host "Memasang Bubblewrap CLI..." -ForegroundColor Cyan
  npm install -g @bubblewrap/cli
}

# 1) Pertama kali: Bubblewrap menawarkan unduh JDK 17 + Android SDK otomatis — jawab Yes.
bubblewrap doctor

# 2) Kunci upload (sekali saja). keytool ikut terpasang bersama JDK milik Bubblewrap.
if (-not (Test-Path ".\nexbill-upload.keystore")) {
  $jdk = Get-ChildItem "$env:USERPROFILE\.bubblewrap\jdk" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  $keytool = if ($jdk) { Join-Path $jdk.FullName "bin\keytool.exe" } else { "keytool" }
  Write-Host "Membuat kunci upload nexbill-upload.keystore (catat & simpan password-nya!)" -ForegroundColor Yellow
  & $keytool -genkeypair -v -keystore nexbill-upload.keystore -alias nexbill -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=NEXBILL, O=NEXBILL, C=ID"
}

# 3) Buat/perbarui proyek Android dari twa-manifest.json, lalu build AAB (Play Store) + APK (uji).
bubblewrap update --skipVersionUpgrade
bubblewrap build --skipPwaValidation

Write-Host ""
Write-Host "Selesai:" -ForegroundColor Green
Write-Host "  app-release-bundle.aab  -> unggah ke Play Console"
Write-Host "  app-release-signed.apk  -> pasang langsung ke HP untuk uji"
Write-Host ""
Write-Host "Sidik jari SHA-256 kunci upload (isi ke env TWA_SHA256_FINGERPRINTS di Vercel):" -ForegroundColor Cyan
$jdk = Get-ChildItem "$env:USERPROFILE\.bubblewrap\jdk" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
$keytool = if ($jdk) { Join-Path $jdk.FullName "bin\keytool.exe" } else { "keytool" }
& $keytool -list -v -keystore nexbill-upload.keystore -alias nexbill | Select-String "SHA256"
