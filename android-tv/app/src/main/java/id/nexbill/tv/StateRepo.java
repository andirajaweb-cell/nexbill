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
    /** PIN per staf yang pernah benar di TV ini: [{salt, hash, staffId, staffName}] — untuk dipakai saat offline. */
    private static final String K_PINS = "pins_v2";
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
        // Layar dipasangkan ulang / dilepas: PIN yang diingat untuk layar lama tidak berlaku lagi, begitu
        // juga sesi lokal, katalog, dan status terakhirnya (antrean yang belum terkirim tetap dikirim
        // dengan token lamanya — lihat SyncEngine).
        prefs(c).edit().putString(K_TOKEN, t).remove(K_PIN_SALT).remove(K_PIN_HASH).remove(K_PINS).apply();
        setCashier("", "");
        LocalStore.clearForNewScreen(c);
        state = null;
        stateWall = 0L;
        notifyListeners();
    }

    static TvState state() {
        return state;
    }

    /**
     * @param requestedRt elapsedRealtime saat permintaan /api/tv/state DIKIRIM. Status yang diminta sebelum
     *                    server menerima aksi dari TV belum memuat aksi itu (lihat serverCaughtUp).
     */
    static void setState(TvState s, long requestedRt) {
        state = s;
        stateWall = System.currentTimeMillis();
        stateRequestedRt = requestedRt;
        notifyListeners();
    }

    /** elapsedRealtime saat permintaan status terakhir dikirim (0 = status hasil pemulihan). */
    private static volatile long stateRequestedRt;
    /** elapsedRealtime saat server terakhir MENERIMA aksi dari TV (balasan /api/tv/sync). */
    private static volatile long actionsAckedRt;

    static void markActionsAcked() {
        actionsAckedRt = android.os.SystemClock.elapsedRealtime();
    }

    /**
     * Status server sudah memuat semua aksi TV yang diterimanya: segar DAN diminta SESUDAH balasan sinkron
     * terakhir. Sebelum itu sesi lokal tetap menjadi acuan — status yang diminta sebelum "stop" sampai di
     * server masih berkata "sedang dipakai", dan memakainya membuat layar game terbuka lagi dengan timer
     * berjalan beberapa detik setelah kasir menekan Akhiri sesi.
     */
    static boolean serverCaughtUp(long nowRealtime) {
        return stateFresh(nowRealtime) && stateRequestedRt > actionsAckedRt;
    }

    /** Jam dinding saat status server terakhir diterima (0 bila hasil pemulihan setelah menyala ulang). */
    private static volatile long stateWall;

    /** Status dari server dianggap segar bila diterima kurang dari ini. */
    private static final long FRESH_MS = 20_000L;

    static boolean stateFresh(long nowRealtime) {
        TvState s = state;
        return s != null && stateWall > 0 && nowRealtime - s.receivedAt < FRESH_MS;
    }

    /**
     * Memulihkan status server terakhir yang tersimpan saat aplikasi/TV menyala ulang tanpa internet,
     * supaya sesi yang sedang berjalan tetap tampil dan tetap terkunci tepat waktu. Jam monotonik
     * (elapsedRealtime) mulai dari nol setelah reboot, jadi titik terimanya dihitung mundur dari jam
     * dinding. Status lebih tua dari 12 jam diabaikan.
     */
    static void restore(Context c) {
        if (state != null || token(c).isEmpty()) return;
        String raw = LocalStore.savedState(c);
        long wall = LocalStore.savedStateWall(c);
        long age = System.currentTimeMillis() - wall;
        if (raw.isEmpty() || wall <= 0 || age < 0 || age > 12 * 3_600_000L) return;
        try {
            state = TvState.parse(raw, android.os.SystemClock.elapsedRealtime() - age);
            stateWall = 0L;
            stateRequestedRt = 0L;
            notifyListeners();
        } catch (Exception ignored) {
        }
    }

    /** Beri tahu tampilan bahwa data lokal (antrean/katalog/sesi) berubah. */
    static void touch() {
        notifyListeners();
    }

    /**
     * Sesi lokal (diatur dari TV) yang menentukan layar saat ini, atau null bila status server yang
     * menjadi acuan. Sesi lokal berlaku selama aksinya belum diterima server ATAU status server sedang
     * tidak segar (internet putus). Begitu semua aksinya diterima server DAN status yang diminta sesudahnya
     * sudah tiba (serverCaughtUp), sesi lokal dilepas — mis. kasir menghentikan sesi dari dashboard, TV
     * ikut terkunci.
     */
    static LocalStore.Session localAuthority(Context c, long nowRealtime) {
        LocalStore.Session l = LocalStore.session(c);
        if (l == null) return null;
        if (LocalStore.hasPendingFor(c, l.sessionId)) return l;
        if (serverCaughtUp(nowRealtime)) {
            LocalStore.setSession(c, null);
            return null;
        }
        return l;
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
    /** Kasir yang terakhir membuka panel dengan PIN-nya (PIN per staf); "" = PIN layar bersama / Owner. */
    private static volatile String cashierId = "";
    private static volatile String cashierName = "";

    static void setCashier(String id, String name) {
        cashierId = id == null ? "" : id;
        cashierName = name == null ? "" : name;
    }

    static String cashierId() {
        return cashierId;
    }

    static String cashierName() {
        return cashierName;
    }

    /** PIN benar menurut server → diingat (hash PBKDF2 bergaram, bukan PIN-nya) bersama staf pemiliknya. */
    static synchronized void rememberPin(Context c, String pin, String staffId, String staffName) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        byte[] hash = pbkdf2(pin, salt);
        if (hash == null) return;
        String sid = staffId == null ? "" : staffId;
        try {
            org.json.JSONArray old = pins(c);
            org.json.JSONArray out = new org.json.JSONArray();
            for (int i = 0; i < old.length(); i++) {
                org.json.JSONObject e = old.optJSONObject(i);
                if (e == null) continue;
                if (e.optString("staffId").equals(sid)) continue; // PIN lama staf yang sama diganti
                if (matches(e, pin)) continue; // PIN yang sama kini milik staf lain
                out.put(e);
            }
            out.put(new org.json.JSONObject().put("salt", hex(salt)).put("hash", hex(hash)).put("staffId", sid).put("staffName", staffName == null ? "" : staffName));
            while (out.length() > 30) out.remove(0);
            prefs(c).edit().putString(K_PINS, out.toString()).remove(K_PIN_SALT).remove(K_PIN_HASH).apply();
        } catch (Exception ignored) {
        }
    }

    private static org.json.JSONArray pins(Context c) {
        try {
            return new org.json.JSONArray(prefs(c).getString(K_PINS, "[]"));
        } catch (Exception e) {
            return new org.json.JSONArray();
        }
    }

    private static boolean matches(org.json.JSONObject e, String pin) {
        String salt = e.optString("salt");
        String want = e.optString("hash");
        if (salt.isEmpty() || want.isEmpty()) return false;
        byte[] got = pbkdf2(pin, unhex(salt));
        return got != null && MessageDigest.isEqual(got, unhex(want));
    }

    static boolean hasRememberedPin(Context c) {
        return pins(c).length() > 0 || !prefs(c).getString(K_PIN_HASH, "").isEmpty();
    }

    /** Saat offline: { staffId, staffName } pemilik PIN ini yang pernah benar di TV ini, atau null. */
    static String[] matchRememberedPin(Context c, String pin) {
        org.json.JSONArray list = pins(c);
        for (int i = 0; i < list.length(); i++) {
            org.json.JSONObject e = list.optJSONObject(i);
            if (e != null && matches(e, pin)) return new String[] { e.optString("staffId"), e.optString("staffName") };
        }
        // PIN versi lama (sebelum 1.2.2): satu PIN layar tanpa staf.
        String salt = prefs(c).getString(K_PIN_SALT, "");
        String want = prefs(c).getString(K_PIN_HASH, "");
        if (salt.isEmpty() || want.isEmpty()) return null;
        byte[] got = pbkdf2(pin, unhex(salt));
        return got != null && MessageDigest.isEqual(got, unhex(want)) ? new String[] { "", "" } : null;
    }

    static void forgetPin(Context c) {
        prefs(c).edit().remove(K_PIN_SALT).remove(K_PIN_HASH).remove(K_PINS).apply();
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
    static boolean showGame(Context c, long nowRealtime) {
        if (staffLeftMs(nowRealtime) > 0) return true;
        TvState s = state;
        if (s != null && !s.enabled) return true; // layar dimatikan dari dashboard → pasif
        LocalStore.Session l = localAuthority(c, nowRealtime);
        if (l != null) return l.active(LocalStore.serverNow(c));
        return s != null && s.shouldShowGame(nowRealtime);
    }

    /** Sesi yang sedang berjalan menurut TV (lokal atau server) — untuk panel kasir. */
    static boolean inSession(Context c, long nowRealtime) {
        LocalStore.Session l = localAuthority(c, nowRealtime);
        if (l != null) return l.active(LocalStore.serverNow(c));
        TvState s = state;
        return s != null && s.inSession() && !s.timeUp && (s.liveRemaining(nowRealtime) == null || s.liveRemaining(nowRealtime) > 0);
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
