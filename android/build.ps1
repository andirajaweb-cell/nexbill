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
  # Memori maksimum Gradle (MB). 1536 = bawaan Bubblewrap, aman dengan JDK 64-bit (dipastikan
  # otomatis oleh Ensure-Jdk64). Turunkan (mis. 1024) hanya kalau RAM PC sangat terbatas.
  [int]$GradleHeapMb = 1536
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

function Test-Java64([string]$jdk) {
  $java = Join-Path $jdk "bin\java.exe"
  if (-not (Test-Path $java)) { return $false }
  $v = (& $java -version 2>&1 | Out-String)
  return ($v -match "64-Bit")
}

function Ensure-Jdk64 {
  # Bubblewrap kadang memasang JDK 32-bit ("OpenJDK Client VM", tanpa "64-Bit"). JDK 32-bit tidak
  # bisa memesan memori >~1 GB sehingga Gradle gagal ("Could not reserve enough space ... heap")
  # walau RAM PC besar. Di sini dipastikan Bubblewrap memakai JDK 17 64-bit.
  $cfgPath = Join-Path $env:USERPROFILE ".bubblewrap\config.json"
  if (-not (Test-Path $cfgPath)) { throw "Konfigurasi Bubblewrap belum ada ($cfgPath). Jalankan dulu: .\build.ps1 (tanpa -Step) agar 'bubblewrap doctor' menyiapkannya." }
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  if ($cfg.jdkPath -and (Test-Java64 $cfg.jdkPath)) {
    $env:JAVA_HOME = $cfg.jdkPath
    Write-Host "JDK 64-bit OK: $($cfg.jdkPath)" -ForegroundColor DarkGray
    return
  }
  $root = Join-Path $env:USERPROFILE ".bubblewrap\jdk-x64"
  $existing = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Java64 $_.FullName } | Select-Object -First 1
  if (-not $existing) {
    Write-Host "JDK yang dipakai Bubblewrap 32-bit -> mengunduh JDK 17 64-bit (+/- 190 MB, sekali saja)..." -ForegroundColor Yellow
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $zip = Join-Path $env:TEMP "temurin17-x64.zip"
    $old = $ProgressPreference; $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk" -OutFile $zip -UseBasicParsing
    $ProgressPreference = $old
    Write-Host "Mengekstrak JDK..." -ForegroundColor Yellow
    Expand-Archive -Path $zip -DestinationPath $root -Force
    Remove-Item $zip -ErrorAction SilentlyContinue
    $existing = Get-ChildItem $root -Directory | Where-Object { Test-Java64 $_.FullName } | Select-Object -First 1
    if (-not $existing) { throw "JDK 64-bit gagal dipasang di $root." }
  }
  $cfg | Add-Member -NotePropertyName jdkPath -NotePropertyValue $existing.FullName -Force
  # Tanpa BOM: Bubblewrap (Node) gagal membaca JSON yang diawali BOM.
  [IO.File]::WriteAllText($cfgPath, ($cfg | ConvertTo-Json -Depth 5))
  $env:JAVA_HOME = $existing.FullName
  Write-Host "Bubblewrap sekarang memakai JDK 64-bit: $($existing.FullName)" -ForegroundColor Green
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
  Ensure-Jdk64
  Set-GradleHeap $GradleHeapMb
  # Hentikan daemon Gradle lama (yang mungkin dibuat dengan JDK/setelan memori lama).
  if (Test-Path ".\gradlew.bat") { cmd /c ".\gradlew.bat --stop >nul 2>&1" }
  Write-Host "Build berjalan tanpa banyak tulisan; build pertama 5-20 menit (unduh library Android)." -ForegroundColor DarkGray
  bubblewrap build --skipPwaValidation
  if ($LASTEXITCODE -ne 0) {
    throw "bubblewrap build gagal (kode $LASTEXITCODE). Pesan error Gradle tampil di atas (tidak ikut tercatat di build-log.txt) - screenshot bagian 'What went wrong'."
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
