package id.nexbill.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.concurrent.CopyOnWriteArrayList;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Satu-satunya tempat status aplikasi: token layar (dari halaman /tv), status terakhir dari server,
 * pilihan input HDMI, mode tampilan, dan mode staf. Dibaca oleh MainActivity dan PollService.
 */
final class StateRepo {
    private static final String PREFS = "nexbill_tv";
    private static final String K_TOKEN = "token";
    private static final String K_INPUT = "hdmi_input";
    private static final String K_MODE_SWITCH = "mode_switch_input";
    private static final String K_PIN_SALT = "pin_salt";
    private static final String K_PIN_HASH = "pin_hash";
    private static final String K_GUARD = "screen_guard";

    private static volatile TvState state;
    private static volatile long staffUntil;
    static volatile boolean activityVisible;
    /** Penjaga layar dijeda sampai waktu ini (elapsedRealtime) — mis. staf sedang membuka Pengaturan TV. */
    private static volatile long guardPausedUntil;

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
        // Layar dipasangkan ulang / dilepas: PIN yang diingat untuk layar lama tidak berlaku lagi.
        prefs(c).edit().putString(K_TOKEN, t).remove(K_PIN_SALT).remove(K_PIN_HASH).apply();
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

    /**
     * PIN menu staf saat internet putus. Server sengaja tidak pernah mengirim PIN atau hash-nya ke TV
     * (lihat /api/tv/unlock). Yang disimpan di sini adalah turunan PBKDF2 dari PIN yang DIKETIK staf dan
     * baru saja dinyatakan BENAR oleh server — jadi PIN offline hanya bisa dipakai setelah staf pernah
     * membuka menu staf satu kali di TV ini saat online. PIN yang diganti di dashboard menimpa ingatan ini
     * begitu dipakai online lagi; layar yang dipasangkan ulang menghapusnya.
     */
    static void rememberPin(Context c, String pin) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        byte[] hash = pbkdf2(pin, salt);
        if (hash == null) return;
        prefs(c).edit().putString(K_PIN_SALT, hex(salt)).putString(K_PIN_HASH, hex(hash)).apply();
    }

    static boolean hasRememberedPin(Context c) {
        return !prefs(c).getString(K_PIN_HASH, "").isEmpty();
    }

    static boolean matchesRememberedPin(Context c, String pin) {
        String salt = prefs(c).getString(K_PIN_SALT, "");
        String want = prefs(c).getString(K_PIN_HASH, "");
        if (salt.isEmpty() || want.isEmpty()) return false;
        byte[] got = pbkdf2(pin, unhex(salt));
        return got != null && MessageDigest.isEqual(got, unhex(want));
    }

    static void forgetPin(Context c) {
        prefs(c).edit().remove(K_PIN_SALT).remove(K_PIN_HASH).apply();
    }

    private static byte[] pbkdf2(String pin, byte[] salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec((pin == null ? "" : pin).toCharArray(), salt, 20_000, 256);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1").generateSecret(spec).getEncoded();
        } catch (Exception e) {
            return null;
        }
    }

    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format(java.util.Locale.ROOT, "%02x", x));
        return sb.toString();
    }

    private static byte[] unhex(String s) {
        byte[] out = new byte[s.length() / 2];
        for (int i = 0; i < out.length; i++) out[i] = (byte) Integer.parseInt(s.substring(i * 2, i * 2 + 2), 16);
        return out;
    }

    /**
     * Penjaga layar (bawaan AKTIF): selama layar terpasang & tidak dimatikan dari dashboard, NEXBILL TV
     * selalu dikembalikan ke depan bila ditinggalkan — tombol Home, tombol input/source, atau aplikasi
     * lain tidak bisa dipakai untuk main tanpa sesi atau melewati waktu habis. Owner bisa mematikannya
     * dari menu staf (ber-PIN) bila TV juga dipakai untuk keperluan lain.
     */
    static boolean guardEnabled(Context c) {
        return prefs(c).getBoolean(K_GUARD, true);
    }

    static void setGuardEnabled(Context c, boolean on) {
        prefs(c).edit().putBoolean(K_GUARD, on).apply();
        notifyListeners();
    }

    static void pauseGuard(long untilRealtime) {
        guardPausedUntil = untilRealtime;
    }

    static boolean guardPaused(long nowRealtime) {
        return nowRealtime < guardPausedUntil;
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
