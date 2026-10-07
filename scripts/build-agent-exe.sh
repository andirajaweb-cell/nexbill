#!/usr/bin/env bash
# =====================================================================================
#  Membangun NexbillAgent.exe (Windows x64) dari public/downloads/nexbill-agent/android/index.js —
#  file yang SAMA dengan agent HP Android (Termux). Sejak v1.4 .exe dibuat sebagai Node Single
#  Executable Application (node:sea) dengan node.exe resmi dari paket npm `node-win-x64`, jadi bisa
#  dibangun dari Linux/macOS/Windows tanpa `pkg` dan tanpa unduhan dari GitHub.
#
#  Pakai:  bash scripts/build-agent-exe.sh [versi-node]     (bawaan: versi `node` yang sedang dipakai)
#  Hasil:  public/downloads/nexbill-agent/NexbillRelay-v<versi-agent>.zip berisi TEPAT empat file:
#          NexbillAgent.exe, adb.exe, AdbWinApi.dll, AdbWinUsbApi.dll (adb diambil dari zip v1.2).
#
#  Catatan:
#   - Versi node.exe HARUS sama dengan versi `node` yang membuat blob SEA. Skrip ini memakai versi
#     node yang sedang berjalan.
#   - .exe hasil injeksi tidak lagi bertanda tangan digital (sama seperti build pkg sebelumnya).
#   - Update otomatis agent butuh manifest bertanda tangan Ed25519 (tools/sign-release.js di proyek
#     agent, kunci privat TIDAK ada di repo ini). Tanpa itu, outlet memperbarui dengan mengunduh zip
#     baru dan menimpa file lama — config.json (token) tetap tersimpan.
# =====================================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/downloads/nexbill-agent/android/index.js"
NODE_VERSION="${1:-$(node -p 'process.versions.node')}"
AGENT_VERSION="$(node -p "require('$SRC').AGENT_VERSION")"
OUT_ZIP="$ROOT/public/downloads/nexbill-agent/NexbillRelay-v${AGENT_VERSION%.*}.zip"
ADB_ZIP="$ROOT/public/downloads/nexbill-agent/NexbillRelay-v1.2.zip"
WORK="$(mktemp -d)"
trap 'echo "File kerja: $WORK"' EXIT

echo "== NexbillAgent $AGENT_VERSION, node.exe $NODE_VERSION =="
cd "$WORK"
"$ROOT/node_modules/.bin/esbuild" "$SRC" --bundle --platform=node --target=node22 --format=cjs \
  --external:bufferutil --external:utf-8-validate --outfile=bundle.cjs --log-level=warning
echo '{"main":"bundle.cjs","output":"sea-prep.blob","disableExperimentalSEAWarning":true,"useCodeCache":false,"useSnapshot":false}' > sea-config.json
node --experimental-sea-config sea-config.json
npm pack "node-win-x64@$NODE_VERSION" --silent >/dev/null
tar xzf "node-win-x64-$NODE_VERSION.tgz"
mkdir dist
cp package/bin/node.exe dist/NexbillAgent.exe
npx --yes postject@1.0.0-alpha.6 dist/NexbillAgent.exe NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
(cd dist && unzip -oq "$ADB_ZIP" adb.exe AdbWinApi.dll AdbWinUsbApi.dll)
python3 - "$OUT_ZIP" "$WORK/dist" <<'PY'
import sys, zipfile, os
out, d = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in ["NexbillAgent.exe", "adb.exe", "AdbWinApi.dll", "AdbWinUsbApi.dll"]:
        z.write(os.path.join(d, f), f)
PY
echo "Selesai: $OUT_ZIP"
