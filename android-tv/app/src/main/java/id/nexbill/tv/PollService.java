package id.nexbill.tv;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

/**
 * Mengambil /api/tv/state setiap 5 detik dengan token layar, lalu menyimpannya di StateRepo.
 * Berjalan sebagai foreground service supaya tetap hidup saat TV dipindah ke input HDMI (mode
 * "Pindah input TV"); di mode itu service ini juga menampilkan timer kecil dan membawa layar
 * NEXBILL kembali ke depan begitu waktu habis.
 */
public class PollService extends Service {
    private static final String CHANNEL = "nexbill_tv";
    private static final int NOTIF_ID = 1;

    private HandlerThread thread;
    private Handler worker;
    private final Handler main = new Handler(Looper.getMainLooper());
    private OverlayTimer overlay;
    private long lastBroughtFront;
    private String lastToken = "";
    /** Token baru dari halaman /tv (pairing selesai) → ambil status SEKARANG, tidak menunggu 5 detik. */
    private final Runnable onRepoChange = () -> {
        String t = StateRepo.token(PollService.this);
        if (!t.equals(lastToken)) {
            lastToken = t;
            if (worker != null && !t.isEmpty()) {
                worker.removeCallbacks(PollService.this.poll);
                worker.post(PollService.this.poll);
            }
        }
    };

    static void start(Context c) {
        Intent i = new Intent(c, PollService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i);
            else c.startService(i);
        } catch (RuntimeException ignored) {
            // Sebagian TV membatasi start dari latar belakang; MainActivity akan mencoba lagi saat dibuka.
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        overlay = new OverlayTimer(this);
        startAsForeground();
        thread = new HandlerThread("nexbill-poll");
        thread.start();
        worker = new Handler(thread.getLooper());
        lastToken = StateRepo.token(this);
        StateRepo.restore(this);
        StateRepo.addListener(onRepoChange);
        worker.post(poll);
        main.post(tick);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        main.removeCallbacks(tick);
        StateRepo.removeListener(onRepoChange);
        if (worker != null) worker.removeCallbacksAndMessages(null);
        if (thread != null) thread.quitSafely();
        overlay.hide();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startAsForeground() {
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CHANNEL, getString(R.string.app_name), NotificationManager.IMPORTANCE_MIN);
            nm.createNotificationChannel(ch);
            b = new Notification.Builder(this, CHANNEL);
        } else {
            b = new Notification.Builder(this);
        }
        Notification n = b.setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(getString(R.string.notif_title))
                .setContentText(getString(R.string.notif_text))
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(NOTIF_ID, n);
    }

    private final Runnable poll = new Runnable() {
        @Override
        public void run() {
            String token = StateRepo.token(PollService.this);
            if (!token.isEmpty()) {
                boolean online = false;
                try {
                    long t0 = System.currentTimeMillis();
                    Http.Result r = Http.request("GET", Config.STATE_URL, token, null);
                    long t1 = System.currentTimeMillis();
                    if (r.code == 401) {
                        // Layar dilepas dari dashboard. Halaman /tv juga akan kembali ke layar pairing.
                        StateRepo.setToken(PollService.this, "");
                    } else if (r.code == 200) {
                        TvState st = TvState.parse(r.body, SystemClock.elapsedRealtime());
                        // Selisih jam server − jam TV, dipakai untuk waktu aksi yang direkam saat offline.
                        if (st.serverTimeMs > 0) LocalStore.setClockOffset(PollService.this, st.serverTimeMs - (t0 + t1) / 2);
                        LocalStore.saveState(PollService.this, r.body);
                        online = true;
                        // Kirim dulu antrean sesi dari TV, baru status dipakai (supaya status sesudah sinkron yang menentukan).
                        if (LocalStore.queue(PollService.this).length() > 0) SyncEngine.syncQueue(PollService.this);
                        StateRepo.setState(st);
                    }
                } catch (Exception ignored) {
                    // Jaringan putus: status terakhir dipertahankan dan timer terus dihitung di TV.
                }
                if (online) SyncEngine.refreshCatalogIfDue(PollService.this, false);
            }
            worker.postDelayed(this, Config.POLL_MS);
        }
    };

    /**
     * Setiap 0,5 detik:
     *  - Mode "Pindah input TV": timer kecil di atas HDMI; saat waktu habis / tanpa sesi, layar NEXBILL
     *    dibawa ke depan lagi.
     *  - Mode HDMI di dalam aplikasi (bawaan) + Penjaga layar: bila aplikasi ditinggalkan (tombol Home,
     *    tombol input/source, aplikasi lain), NEXBILL TV dikembalikan ke depan dalam ±1 detik — baik saat
     *    sesi berjalan (HDMI tampil lagi di dalam aplikasi, timer & batas waktu tetap berlaku) maupun di
     *    luar sesi (layar terkunci).
     * Tidak berjalan bila layar belum terpasang, dimatikan dari dashboard, dimatikan owner, atau dijeda
     * staf (mis. sedang membuka Pengaturan TV).
     */
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            Context c = PollService.this;
            long now = SystemClock.elapsedRealtime();
            expireLocalSession(c);
            TvState s = StateRepo.state();
            boolean paired = !StateRepo.token(c).isEmpty();
            // Belum ada status server (TV menyala tanpa internet & status lama tidak bisa dipulihkan): tetap
            // dianggap aktif — penjaga layar tidak boleh mati hanya karena internet putus.
            boolean active = paired && (s == null || s.enabled) && !StateRepo.guardPaused(now);
            if (StateRepo.switchInputMode(c)) {
                if (StateRepo.activityVisible) {
                    overlay.hide();
                } else if (StateRepo.showGame(c, now)) {
                    overlay.show(TvState.timerText(c, s, now, StateRepo.staffLeftMs(now)), s != null && s.isWarning(now));
                } else {
                    overlay.hide();
                    if (active || !paired || s == null) bringToFront(now, 5000);
                }
            } else {
                overlay.hide();
                if (active && StateRepo.guardEnabled(c) && !StateRepo.activityVisible) bringToFront(now, GUARD_RETRY_MS);
            }
            main.postDelayed(this, TICK_MS);
        }
    };

    private static final long TICK_MS = 500;

    /**
     * Sesi yang diatur dari TV dan waktunya habis: dicatat "stop" tepat pada waktu habisnya (bukan saat
     * TV online lagi), lalu layar terkunci. Sesi lokal yang sudah berhenti dan semua aksinya sudah
     * diterima server dilepas.
     */
    static void expireLocalSession(Context c) {
        LocalStore.Session l = LocalStore.session(c);
        if (l == null) return;
        long serverNow = LocalStore.serverNow(c);
        if (!l.ended && l.plannedMinutes > 0 && serverNow >= l.endAt()) {
            l.ended = true;
            LocalStore.setSession(c, l);
            LocalStore.enqueue(c, "stop", l.sessionId, l.endAt(), null);
            StateRepo.touch();
        } else if (l.ended && !LocalStore.hasPendingFor(c, l.sessionId)) {
            LocalStore.setSession(c, null);
            StateRepo.touch();
        }
    }
    /** Jeda antar-percobaan membawa layar ke depan saat penjaga aktif (target pulih ≤ 1 detik). */
    private static final long GUARD_RETRY_MS = 800;

    private void bringToFront(long now, long minGapMs) {
        if (now - lastBroughtFront < minGapMs) return;
        lastBroughtFront = now;
        Intent i = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            startActivity(i);
        } catch (RuntimeException ignored) {
            // Tanpa izin tampil di atas aplikasi lain, Android bisa menolak ini — panduan di menu staf.
        }
    }
}
