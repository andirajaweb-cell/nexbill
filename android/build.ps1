# Build aplikasi NEXBILL Android (Trusted Web Activity) di Windows.
#
# Jalankan dari jendela PowerShell biasa (BUKAN terminal VS Code - build pertama mengunduh
# Gradle +/- 150 MB dan memakan banyak RAM, terminal VS Code bisa ikut tertutup):
#
#   cd "C:\AGENTIC\POS Rental PS\pos-rental-ps\android"
#   powershell -ExecutionPolicy Bypass -File .\build.ps1                 # build lengkap
#   powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step fingerprint   # hanya tampilkan SHA-256
#
# Semua output juga dicatat ke build-log.txt, dan jendela TIDAK menutup sendiri kalau ada error.
# Panduan lengkap: README-PLAYSTORE.md
param(
  [ValidateSet("all", "fingerprint", "build")]
  [string]$Step = "all",
  # Memori maksimum Gradle (MB). Bawaan Bubblewrap 1536 sering gagal di PC dengan RAM/pagefile
  # terbatas ("Could not reserve enough space for ... object heap"). Proyek TWA cukup 1024; kalau
  # masih gagal coba 768.
  [int]$GradleHeapMb = 1024
)

Set-Location -Path $PSScriptRoot
Start-Transcript -Path (Join-Path $PSScriptRoot "build-log.txt") -Append | Out-Null

function Find-Keytool {
  $candidates = @()
  $bw = Join-Path $env:USERPROFILE ".bubblewrap\jdk"
  if (Test-Path $bw) { $candidates += Get-ChildItem $bw -Recurse -Filter keytool.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName }
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME "bin\keytool.exe") }
  $candidates += "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
  foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }
  $cmd = Get-Command keytool -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Set-GradleHeap([int]$mb) {
  # bubblewrap update membuat ulang gradle.properties dengan -Xmx1536m, jadi selalu dipasang ulang
  # tepat sebelum build.
  $file = Join-Path $PSScriptRoot "gradle.properties"
  if (-not (Test-Path $file)) { return }
  $lines = Get-Content $file | Where-Object { $_ -notmatch '^\s*org\.gradle\.jvmargs=' }
  $lines += "org.gradle.jvmargs=-Xmx${mb}m -Dfile.encoding=UTF-8"
  Set-Content -Path $file -Value $lines -Encoding ASCII
  Write-Host "Memori Gradle diatur ke ${mb} MB (gradle.properties)." -ForegroundColor DarkGray
}

function Show-Fingerprint {
  $keytool = Find-Keytool
  if (-not $keytool) { Write-Host "keytool tidak ditemukan. Jalankan dulu build lengkap (bubblewrap doctor memasang JDK)." -ForegroundColor Red; return }
  if (-not (Test-Path ".\nexbill-upload.keystore")) { Write-Host "nexbill-upload.keystore belum ada di folder ini." -ForegroundColor Red; return }
  Write-Host ""
  Write-Host "Masukkan password keystore (yang dibuat saat pertama kali). Ketikan tidak terlihat - itu normal." -ForegroundColor Cyan
  $out = & $keytool -list -v -keystore nexbill-upload.keystore -alias nexbill 2>&1
  $sha = $out | Select-String -Pattern "SHA256:\s*([0-9A-F:]{95})" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -First 1
  if ($sha) {
    Write-Host ""
    Write-Host "SHA-256 kunci upload:" -ForegroundColor Green
    Write-Host "  $sha" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Isi ke Vercel -> Settings -> Environment Variables:" -ForegroundColor Green
    Write-Host "  TWA_SHA256_FINGERPRINTS = $sha"
    try { Set-Clipboard -Value $sha; Write-Host "(sudah disalin ke clipboard)" } catch {}
  } else {
    Write-Host "Gagal membaca sidik jari - kemungkinan password salah. Output keytool:" -ForegroundColor Red
    $out | ForEach-Object { Write-Host "  $_" }
  }
}

try {
  if ($Step -eq "fingerprint") { Show-Fingerprint; return }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js belum terpasang. Pasang Node 18+ dari https://nodejs.org lalu ulangi." }
  if (-not (Get-Command bubblewrap -ErrorAction SilentlyContinue)) {
    Write-Host "Memasang Bubblewrap CLI..." -ForegroundColor Cyan
    npm install -g @bubblewrap/cli
  }

  if ($Step -eq "all") {
    # 1) Pertama kali: Bubblewrap menawarkan unduh JDK 17 + Android SDK otomatis - jawab Yes.
    bubblewrap doctor

    # 2) Kunci upload (sekali saja).
    if (-not (Test-Path ".\nexbill-upload.keystore")) {
      $keytool = Find-Keytool
      if (-not $keytool) { throw "keytool tidak ditemukan - jalankan 'bubblewrap doctor' sampai JDK terpasang." }
      Write-Host "Membuat kunci upload nexbill-upload.keystore - CATAT & SIMPAN password-nya!" -ForegroundColor Yellow
      & $keytool -genkeypair -v -keystore nexbill-upload.keystore -alias nexbill -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=NEXBILL, O=NEXBILL, C=ID"
    } else {
      Write-Host "Kunci upload sudah ada (nexbill-upload.keystore) - dipakai ulang." -ForegroundColor DarkGray
    }

    # 3) Buat/perbarui proyek Android dari twa-manifest.json.
    bubblewrap update --skipVersionUpgrade
  }

  # 4) Build AAB (Play Store) + APK (uji). Bubblewrap menanyakan password keystore & key -
  #    keduanya sama dengan yang dibuat di langkah 2. Build pertama mengunduh Gradle (lama).
  Set-GradleHeap $GradleHeapMb
  # Hentikan daemon Gradle lama (yang mungkin dibuat dengan setelan memori lama).
  if (Test-Path ".\gradlew.bat") { & .\gradlew.bat --stop 2>$null | Out-Null }
  bubblewrap build --skipPwaValidation
  if ($LASTEXITCODE -ne 0) {
    throw "bubblewrap build gagal (kode $LASTEXITCODE). Kalau pesannya 'Could not reserve enough space ... object heap', tutup Chrome/VS Code lalu ulangi dengan: .\build.ps1 -Step build -GradleHeapMb 768"
  }

  Write-Host ""
  Write-Host "Selesai:" -ForegroundColor Green
  Write-Host "  app-release-bundle.aab  -> unggah ke Play Console"
  Write-Host "  app-release-signed.apk  -> pasang langsung ke HP untuk uji"
  Show-Fingerprint
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
