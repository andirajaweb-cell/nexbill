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
                try {
                    Http.Result r = Http.request("GET", Config.STATE_URL, token, null);
                    if (r.code == 401) {
                        // Layar dilepas dari dashboard. Halaman /tv juga akan kembali ke layar pairing.
                        StateRepo.setToken(PollService.this, "");
                    } else if (r.code == 200) {
                        StateRepo.setState(TvState.parse(r.body, SystemClock.elapsedRealtime()));
                    }
                } catch (Exception ignored) {
                    // Jaringan putus: status terakhir dipertahankan dan timer terus dihitung di TV.
                }
            }
            worker.postDelayed(this, Config.POLL_MS);
        }
    };

    /** Hanya bekerja di mode "Pindah input TV" ketika layar NEXBILL tidak sedang di depan. */
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            Context c = PollService.this;
            long now = SystemClock.elapsedRealtime();
            if (!StateRepo.switchInputMode(c) || StateRepo.activityVisible) {
                overlay.hide();
            } else if (StateRepo.showGame(now)) {
                TvState s = StateRepo.state();
                overlay.show(TvState.timerText(c, s, now, StateRepo.staffLeftMs(now)), s != null && s.isWarning(now));
            } else {
                overlay.hide();
                bringToFront(now);
            }
            main.postDelayed(this, 1000);
        }
    };

    private void bringToFront(long now) {
        if (now - lastBroughtFront < 5000) return;
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
