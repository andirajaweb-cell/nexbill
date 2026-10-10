package id.nexbill.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Satu-satunya tempat status aplikasi: token layar (dari halaman /tv), status terakhir dari server,
 * pilihan input HDMI, mode tampilan, dan mode staf. Dibaca oleh MainActivity dan PollService.
 */
final class StateRepo {
    private static final String PREFS = "nexbill_tv";
    private static final String K_TOKEN = "token";
    private static final String K_INPUT = "hdmi_input";
    private static final String K_MODE_SWITCH = "mode_switch_input";

    private static volatile TvState state;
    private static volatile long staffUntil;
    static volatile boolean activityVisible;

    private static final CopyOnWriteArrayList<Runnable> listeners = new CopyOnWriteArrayList<>();
    private static final Handler main = new Handler(Looper.getMainLooper());

    private StateRepo() {}

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String token(Context c) {
        return prefs(c).getString(K_TOKEN, "");
    }

    /** Dipanggil halaman /tv lewat jembatan JavaScript setiap kali token dipasang atau dicabut. */
    static void setToken(Context c, String token) {
        String t = token == null ? "" : token.trim();
        if (t.equals(token(c))) return;
        prefs(c).edit().putString(K_TOKEN, t).apply();
        if (t.isEmpty()) state = null;
        notifyListeners();
    }

    static TvState state() {
        return state;
    }

    static void setState(TvState s) {
        state = s;
        notifyListeners();
    }

    static String hdmiInput(Context c) {
        return prefs(c).getString(K_INPUT, "");
    }

    static void setHdmiInput(Context c, String inputId) {
        prefs(c).edit().putString(K_INPUT, inputId == null ? "" : inputId).apply();
        notifyListeners();
    }

    /** false = HDMI ditampilkan di dalam aplikasi (TvView); true = TV dipindah ke input HDMI-nya. */
    static boolean switchInputMode(Context c) {
        return prefs(c).getBoolean(K_MODE_SWITCH, false);
    }

    static void setSwitchInputMode(Context c, boolean on) {
        prefs(c).edit().putBoolean(K_MODE_SWITCH, on).apply();
        notifyListeners();
    }

    static long staffLeftMs(long nowRealtime) {
        return Math.max(0, staffUntil - nowRealtime);
    }

    static void setStaffUntil(long untilRealtime) {
        staffUntil = untilRealtime;
        notifyListeners();
    }

    /** Layar game (HDMI) yang seharusnya tampil sekarang. */
    static boolean showGame(long nowRealtime) {
        TvState s = state;
        return staffLeftMs(nowRealtime) > 0 || (s != null && s.shouldShowGame(nowRealtime));
    }

    static void addListener(Runnable r) {
        listeners.addIfAbsent(r);
    }

    static void removeListener(Runnable r) {
        listeners.remove(r);
    }

    private static void notifyListeners() {
        main.post(() -> {
            for (Runnable r : listeners) r.run();
        });
    }
}
