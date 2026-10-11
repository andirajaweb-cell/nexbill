# Build aplikasi NEXBILL TV (Android TV) di Windows — memakai JDK 17 & Android SDK yang SUDAH
# dipasang Bubblewrap saat membangun aplikasi NEXBILL Android (folder ..\android). Tidak perlu
# Android Studio.
#
# Jalankan dari jendela PowerShell biasa:
#
#   cd "C:\AGENTIC\POS Rental PS\pos-rental-ps\android-tv"
#   powershell -ExecutionPolicy Bypass -File .\build.ps1              # APK uji (debug) + rilis bertanda tangan
#   powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step debug  # hanya APK uji, tanpa kunci
#   powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step publish # rilis + salin ke public\downloads\nexbill-tv
#
# Hasil:
#   app\build\outputs\apk\debug\app-debug.apk         -> uji di TV (flashdisk / Downloader)
#   app\build\outputs\apk\release\app-release.apk     -> rilis (bertanda tangan kunci upload)
#   app\build\outputs\bundle\release\app-release.aab  -> unggah ke Play Console
#   -Step publish: ..\public\downloads\nexbill-tv\nexbill-tv.apk + latest.json (diunduh TV lewat nexbill.id/tvapk)
#
# Semua output dicatat ke build-log.txt, dan jendela TIDAK menutup sendiri kalau ada error.
param(
  [ValidateSet("all", "debug", "publish")]
  [string]$Step = "all"
)

Set-Location -Path $PSScriptRoot
Start-Transcript -Path (Join-Path $PSScriptRoot "build-log.txt") -Append | Out-Null

$Keystore = Join-Path $PSScriptRoot "nexbill-tv-upload.keystore"
$KeyAlias = "nexbilltv"

function Use-BubblewrapToolchain {
  $cfgPath = Join-Path $env:USERPROFILE ".bubblewrap\config.json"
  if (-not (Test-Path $cfgPath)) {
    throw "Bubblewrap belum disiapkan ($cfgPath tidak ada). Jalankan dulu build aplikasi NEXBILL Android: ..\android\build.ps1 — itu memasang JDK 17 dan Android SDK yang juga dipakai di sini."
  }
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  if (-not $cfg.jdkPath -or -not (Test-Path (Join-Path $cfg.jdkPath "bin\java.exe"))) { throw "JDK di $($cfg.jdkPath) tidak ditemukan. Jalankan ..\android\build.ps1 sekali lagi." }
  if (-not $cfg.androidSdkPath -or -not (Test-Path $cfg.androidSdkPath)) { throw "Android SDK di $($cfg.androidSdkPath) tidak ditemukan. Jalankan 'bubblewrap doctor'." }
  $env:JAVA_HOME = $cfg.jdkPath
  $env:ANDROID_HOME = $cfg.androidSdkPath
  $env:ANDROID_SDK_ROOT = $cfg.androidSdkPath
  # Gradle membaca lokasi SDK dari local.properties (tidak di-commit; lihat .gitignore).
  $sdk = $cfg.androidSdkPath -replace '\\', '\\'
  Set-Content -Path (Join-Path $PSScriptRoot "local.properties") -Value "sdk.dir=$sdk" -Encoding ASCII
  Write-Host "JDK : $($cfg.jdkPath)" -ForegroundColor DarkGray
  Write-Host "SDK : $($cfg.androidSdkPath)" -ForegroundColor DarkGray
}

function Find-Keytool {
  $k = Join-Path $env:JAVA_HOME "bin\keytool.exe"
  if (Test-Path $k) { return $k }
  $cmd = Get-Command keytool -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Read-Secret([string]$prompt) {
  $s = Read-Host -Prompt $prompt -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

function Ensure-Keystore {
  if (Test-Path $Keystore) { Write-Host "Kunci upload sudah ada (nexbill-tv-upload.keystore) - dipakai ulang." -ForegroundColor DarkGray; return }
  $keytool = Find-Keytool
  if (-not $keytool) { throw "keytool tidak ditemukan di JDK Bubblewrap." }
  Write-Host ""
  Write-Host "Membuat kunci upload NEXBILL TV (sekali saja)." -ForegroundColor Yellow
  Write-Host "CATAT password-nya dan SIMPAN CADANGAN file nexbill-tv-upload.keystore di tempat aman" -ForegroundColor Yellow
  Write-Host "(mis. Google Drive pribadi). Kalau hilang, versi baru tidak bisa memperbarui aplikasi yang sudah terpasang di TV." -ForegroundColor Yellow
  & $keytool -genkeypair -v -keystore $Keystore -alias $KeyAlias -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=NEXBILL TV, O=NEXBILL, C=ID"
  if ($LASTEXITCODE -ne 0) { throw "Pembuatan kunci gagal." }
}

function Get-AppVersion {
  $gradle = Get-Content (Join-Path $PSScriptRoot "app\build.gradle") -Raw
  $code = [int]([regex]::Match($gradle, "versionCode\s+(\d+)").Groups[1].Value)
  $name = [regex]::Match($gradle, "versionName\s+'([^']+)'").Groups[1].Value
  $cfg = Get-Content (Join-Path $PSScriptRoot "app\src\main\java\id\nexbill\tv\Config.java") -Raw
  $cfgName = [regex]::Match($cfg, 'APP_VERSION = "([^"]+)"').Groups[1].Value
  $cfgCode = [int]([regex]::Match($cfg, 'VERSION_CODE = (\d+)').Groups[1].Value)
  if ($cfgName -ne $name -or $cfgCode -ne $code) {
    throw "Versi tidak sama: build.gradle $name ($code) vs Config.java $cfgName ($cfgCode). Samakan keduanya dulu."
  }
  return @{ Code = $code; Name = $name }
}

function Invoke-Gradle([string[]]$tasks) {
  cmd /c ".\gradlew.bat --stop >nul 2>&1"
  & .\gradlew.bat --no-daemon @tasks
  if ($LASTEXITCODE -ne 0) { throw "Gradle gagal (kode $LASTEXITCODE). Screenshot bagian 'What went wrong' di atas lalu kirim ke tim." }
}

try {
  Use-BubblewrapToolchain
  $ver = Get-AppVersion
  Write-Host "NEXBILL TV $($ver.Name) (versionCode $($ver.Code))" -ForegroundColor Cyan
  Write-Host "Build pertama mengunduh Gradle & pustaka Android (5-20 menit)." -ForegroundColor DarkGray

  if ($Step -eq "debug") {
    Invoke-Gradle @("assembleDebug")
    Write-Host ""
    Write-Host "Selesai: app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
    return
  }

  Ensure-Keystore
  Write-Host ""
  Write-Host "Masukkan password kunci upload (ketikan tidak terlihat - itu normal)." -ForegroundColor Cyan
  $pw = Read-Secret "Password"
  $env:NEXBILL_TV_KEYSTORE = $Keystore
  $env:NEXBILL_TV_KEYSTORE_PASSWORD = $pw
  $env:NEXBILL_TV_KEY_ALIAS = $KeyAlias
  $env:NEXBILL_TV_KEY_PASSWORD = $pw
  try {
    Invoke-Gradle @("assembleDebug", "assembleRelease", "bundleRelease")
  } finally {
    Remove-Item Env:NEXBILL_TV_KEYSTORE_PASSWORD, Env:NEXBILL_TV_KEY_PASSWORD -ErrorAction SilentlyContinue
  }

  $apk = Join-Path $PSScriptRoot "app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $apk)) { throw "APK rilis tidak ditemukan di $apk." }
  Write-Host ""
  Write-Host "Selesai:" -ForegroundColor Green
  Write-Host "  app\build\outputs\apk\debug\app-debug.apk        -> uji"
  Write-Host "  app\build\outputs\apk\release\app-release.apk    -> rilis (dipasang lewat Downloader)"
  Write-Host "  app\build\outputs\bundle\release\app-release.aab -> Play Console"

  if ($Step -eq "publish") {
    # APK rilis + latest.json ke folder unduhan situs. Setelah commit & push, TV memasang/memperbarui
    # lewat aplikasi Downloader dengan alamat nexbill.id/tvapk, dan menu staf "Cek pembaruan" membaca latest.json.
    $dest = Join-Path $PSScriptRoot "..\public\downloads\nexbill-tv"
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item $apk (Join-Path $dest "nexbill-tv.apk") -Force
    $sha = (Get-FileHash (Join-Path $dest "nexbill-tv.apk") -Algorithm SHA256).Hash.ToLower()
    $size = (Get-Item (Join-Path $dest "nexbill-tv.apk")).Length
    $json = [ordered]@{ versionCode = $ver.Code; versionName = $ver.Name; url = "https://nexbill.id/downloads/nexbill-tv/nexbill-tv.apk"; size = $size; sha256 = $sha }
    [IO.File]::WriteAllText((Join-Path $dest "latest.json"), ($json | ConvertTo-Json))
    Write-Host ""
    Write-Host "Diterbitkan ke public\downloads\nexbill-tv\ (nexbill-tv.apk + latest.json)." -ForegroundColor Green
    Write-Host "Commit kedua file itu lalu push. Setelah Vercel selesai, TV bisa memasang lewat Downloader: nexbill.id/tvapk" -ForegroundColor Green
  }
}
catch {
  Write-Host ""
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Log lengkap: $(Join-Path $PSScriptRoot 'build-log.txt')"
}
finally {
  Stop-Transcript | Out-Null
  Write-Host ""
  Read-Host "Tekan Enter untuk menutup jendela ini"
}
