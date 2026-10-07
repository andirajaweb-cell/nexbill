#!/data/data/com.termux/files/usr/bin/bash
# =====================================================================================
#  NEXBILL Relay Agent — pemasangan di HP Android (aplikasi Termux)
#  Jalankan di Termux dengan SATU perintah (salin dari halaman Kontrol Perangkat):
#    pkg install -y curl && curl -fsSL https://www.nexbill.id/downloads/nexbill-agent/android/install.sh | bash
#  Aman dijalankan ulang (untuk memperbarui agent). Token tersimpan di ~/nexbill/config.json.
# =====================================================================================
set -e
BASE="https://www.nexbill.id/downloads/nexbill-agent/android"
DIR="$HOME/nexbill"
BIN="${PREFIX:-/data/data/com.termux/files/usr}/bin"

say() { printf '\n\033[1;36m%s\033[0m\n' "$1"; }

say "== NEXBILL Relay Agent untuk HP Android =="
echo "Pastikan HP terhubung ke WiFi outlet (WiFi yang sama dengan TV) dan sedang dicas."

say "[1/5] Memasang Node.js dan adb (butuh internet, sekitar 2-5 menit)..."
yes | pkg update -y >/dev/null 2>&1 || true
pkg install -y nodejs-lts android-tools curl >/dev/null

say "[2/5] Mengunduh NexbillAgent..."
mkdir -p "$DIR"
curl -fsSL "$BASE/index.js" -o "$DIR/index.js.new"
mv "$DIR/index.js.new" "$DIR/index.js"
cd "$DIR"
[ -f package.json ] || printf '{ "name": "nexbill-relay-agent-android", "private": true }\n' > package.json
npm install --silent --no-audit --no-fund ws@8 >/dev/null

say "[3/5] Membuat perintah pintas: nexbill, nexbill-tv, nexbill-update..."
cat > "$BIN/nexbill" <<'EOS'
#!/data/data/com.termux/files/usr/bin/bash
# Menyalakan NEXBILL Relay Agent. Biarkan Termux terbuka (boleh di belakang).
# Agent berjalan dalam putaran: setelah update otomatis (kode 75) atau berhenti tak terduga, agent
# dinyalakan lagi sendiri. Ctrl+C / tutup normal = berhenti.
termux-wake-lock 2>/dev/null || true
cd "$HOME/nexbill" || exit 1
while true; do
  node index.js "$@"
  code=$?
  set --   # argumen seperti --lang hanya dipakai sekali
  case "$code" in
    0|130) exit 0 ;;
    75) echo "[NEXBILL] Versi baru terpasang - menyalakan ulang..."; sleep 2 ;;
    *) echo "[NEXBILL] Agent berhenti (kode $code) - menyalakan ulang dalam 10 detik..."; sleep 10 ;;
  esac
done
EOS
cat > "$BIN/nexbill-tv" <<'EOS'
#!/data/data/com.termux/files/usr/bin/bash
# Menyambungkan HP ini ke satu Android TV (sekali per TV). Contoh: nexbill-tv 192.168.1.50
if [ -z "$1" ]; then
  echo "Cara pakai: nexbill-tv <alamat IP TV>   contoh: nexbill-tv 192.168.1.50"
  exit 1
fi
case "$1" in *:*) T="$1" ;; *) T="$1:5555" ;; esac
echo "Menghubungkan ke TV $T ..."
echo ">> LIHAT LAYAR TV: centang 'Selalu izinkan dari komputer ini', lalu pilih IZINKAN / ALLOW."
adb connect "$T"
sleep 4
adb devices
echo "Kalau tertulis 'device' di samping $T berarti BERHASIL. Kalau 'unauthorized', ulangi dan pilih Izinkan di TV."
EOS
cat > "$BIN/nexbill-update" <<'EOS'
#!/data/data/com.termux/files/usr/bin/bash
# Memperbarui NEXBILL Relay Agent ke versi terbaru (token tetap tersimpan).
curl -fsSL https://www.nexbill.id/downloads/nexbill-agent/android/install.sh | NEXBILL_NO_START=1 bash
echo "Selesai. Jalankan: nexbill"
EOS
chmod +x "$BIN/nexbill" "$BIN/nexbill-tv" "$BIN/nexbill-update"

say "[4/5] Mengatur agar agent menyala otomatis saat HP dinyalakan (butuh aplikasi Termux:Boot)..."
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/start-nexbill.sh" <<'EOS'
#!/data/data/com.termux/files/usr/bin/sh
# Dijalankan Termux:Boot saat HP menyala. Agent dinyalakan ulang otomatis setelah update/berhenti.
termux-wake-lock
cd "$HOME/nexbill" || exit 1
while true; do
  # log dibatasi ~1 MB supaya memori HP tidak penuh
  if [ -f agent-boot.log ] && [ "$(wc -c < agent-boot.log)" -gt 1000000 ]; then : > agent-boot.log; fi
  node index.js >> agent-boot.log 2>&1
  code=$?
  [ "$code" = "0" ] && break
  sleep 5
done
EOS
chmod +x "$HOME/.termux/boot/start-nexbill.sh"

say "[5/5] Selesai dipasang."
echo "Perintah yang bisa dipakai di Termux:"
echo "  nexbill              -> menyalakan agent"
echo "  nexbill-tv <IP TV>   -> menyambungkan ke TV (sekali per TV)"
echo "  nexbill-update       -> memperbarui agent sekarang (otomatis juga tiap malam 03.00-06.00)"
echo "  nexbill --lang       -> mengganti bahasa"

if [ -z "$NEXBILL_NO_START" ]; then
  say "Menyalakan agent sekarang. Pilih bahasa (Enter = Indonesia), lalu tempel TOKEN dari NEXBILL."
  exec "$BIN/nexbill" < /dev/tty
fi
