package id.nexbill.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;

/**
 * Data yang disimpan di TV supaya kasir tetap bisa mengatur sesi saat internet putus, dan supaya
 * sesi yang sedang berjalan tetap terkunci tepat waktu walau TV/aplikasi dinyalakan ulang.
 *
 *  - Sesi lokal: sesi yang dimulai/diubah dari TV. Selama aksinya belum terkirim ke server, sesi
 *    lokal yang menentukan layar (HDMI tampil / terkunci); setelah terkirim dan server membalas,
 *    status dari server kembali menjadi acuan.
 *  - Antrean aksi: format Mode Offline (lib/offline/protocol.ts) — start / extend / stop dengan id
 *    UUID buatan TV, jadi mengirim ulang tidak pernah menggandakan sesi.
 *  - Katalog: tarif, paket, durasi unit ini dari /api/tv/catalog.
 *  - Status server terakhir + selisih jam TV terhadap server.
 *
 * Semua milik SATU layar (token). Layar dipasangkan ulang ke outlet/unit lain → data lama dihapus,
 * kecuali antrean yang belum terkirim (tetap dikirim dengan token lamanya).
 */
final class LocalStore {
    private static final String PREFS = "nexbill_tv_local";
    private static final String K_SESSION = "local_session";
    private static final String K_QUEUE = "action_queue";
    private static final String K_CATALOG = "catalog";
    private static final String K_CATALOG_AT = "catalog_at";
    private static final String K_STATE = "last_state";
    private static final String K_STATE_WALL = "last_state_wall";
    private static final String K_OFFSET = "clock_offset";
    private static final String K_LAST_SYNC = "last_sync_wall";
    private static final String K_LAST_SYNC_ERROR = "last_sync_error";

    /** Aksi yang gagal ditolak server sebanyak ini tidak dikirim otomatis lagi (perlu ditinjau). */
    static final int MAX_ATTEMPTS = 3;

    private LocalStore() {}

    private static SharedPreferences p(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /* ---------------- jam ---------------- */

    /** Selisih jam server − jam TV (ms), diukur setiap balasan /api/tv/state. */
    static long clockOffset(Context c) {
        return p(c).getLong(K_OFFSET, 0L);
    }

    static void setClockOffset(Context c, long offsetMs) {
        // Jam dari server dipercaya: titik acuan "tidak boleh mundur" diatur ulang ke sana.
        long trusted = System.currentTimeMillis() + offsetMs;
        p(c).edit().putLong(K_OFFSET, offsetMs).putLong(K_HIGH, trusted).apply();
        synchronized (LocalStore.class) {
            monoBase = trusted;
            monoStartRt = SystemClock.elapsedRealtime();
            lastHighSaved = trusted;
        }
    }

    private static final String K_HIGH = "time_high_water";
    private static long monoBase = -1L;
    private static long monoStartRt;
    private static long lastHighSaved;

    /**
     * "Sekarang" menurut jam server (jam TV + selisih terakhir) — dan TIDAK PERNAH mundur.
     *
     * Banyak TV tidak punya baterai jam: setelah listrik padam dan dinyalakan tanpa internet, jamnya
     * bisa kembali ke tahun lama. Jam yang mundur membuat sesi lokal tampak belum habis (layar game
     * terbuka terus), dan jam yang sengaja dimundurkan bisa dipakai main gratis. Karena itu waktu
     * dihitung dari titik tertinggi yang pernah terlihat (disimpan) + jam monotonik sejak aplikasi
     * berjalan; jam TV hanya dipakai bila lebih maju. Waktu selama TV mati tidak terhitung (sesi
     * berlanjut setelah menyala) — lebih aman daripada layar yang tidak pernah terkunci.
     */
    static synchronized long serverNow(Context c) {
        long wall = System.currentTimeMillis() + clockOffset(c);
        long rt = SystemClock.elapsedRealtime();
        if (monoBase < 0) {
            monoBase = p(c).getLong(K_HIGH, 0L);
            monoStartRt = rt;
            lastHighSaved = monoBase;
        }
        long mono = monoBase > 0 ? monoBase + (rt - monoStartRt) : 0L;
        long now = Math.max(wall, mono);
        if (now - lastHighSaved > 10_000L) {
            lastHighSaved = now;
            p(c).edit().putLong(K_HIGH, now).apply();
        }
        return now;
    }

    static String iso(long epochMs) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(epochMs));
    }

    static long parseIso(String iso) {
        if (iso == null || iso.isEmpty()) return 0L;
        String[] patterns = { "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'" };
        for (String pat : patterns) {
            try {
                SimpleDateFormat f = new SimpleDateFormat(pat, Locale.ROOT);
                f.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date d = f.parse(iso);
                if (d != null) return d.getTime();
            } catch (Exception ignored) {
            }
        }
        return 0L;
    }

    /* ---------------- sesi lokal ---------------- */

    /** Sesi yang diatur dari TV. plannedMinutes = 0 → sesi terbuka (dihentikan manual). */
    static final class Session {
        String sessionId;
        long startAt;
        int plannedMinutes;
        int extendedMinutes;
        String label;
        long priceEstimate;
        /** true bila sesi ini sudah dihentikan (menunggu stop terkirim). */
        boolean ended;

        long endAt() {
            return plannedMinutes <= 0 ? Long.MAX_VALUE : startAt + (plannedMinutes + (long) extendedMinutes) * 60_000L;
        }

        /** Sisa detik; null untuk sesi terbuka. */
        Integer remainingSeconds(long serverNow) {
            if (plannedMinutes <= 0) return null;
            return (int) Math.max(0, (endAt() - serverNow) / 1000);
        }

        long elapsedSeconds(long serverNow) {
            return Math.max(0, (serverNow - startAt) / 1000);
        }

        boolean active(long serverNow) {
            return !ended && serverNow < endAt();
        }

        JSONObject toJson() throws Exception {
            return new JSONObject()
                    .put("sessionId", sessionId)
                    .put("startAt", startAt)
                    .put("plannedMinutes", plannedMinutes)
                    .put("extendedMinutes", extendedMinutes)
                    .put("label", label == null ? "" : label)
                    .put("priceEstimate", priceEstimate)
                    .put("ended", ended);
        }

        static Session fromJson(JSONObject o) {
            Session s = new Session();
            s.sessionId = o.optString("sessionId", "");
            s.startAt = o.optLong("startAt", 0L);
            s.plannedMinutes = o.optInt("plannedMinutes", 0);
            s.extendedMinutes = o.optInt("extendedMinutes", 0);
            s.label = o.optString("label", "");
            s.priceEstimate = o.optLong("priceEstimate", 0L);
            s.ended = o.optBoolean("ended", false);
            return s;
        }
    }

    static synchronized Session session(Context c) {
        String raw = p(c).getString(K_SESSION, "");
        if (raw.isEmpty()) return null;
        try {
            Session s = Session.fromJson(new JSONObject(raw));
            return s.sessionId.isEmpty() ? null : s;
        } catch (Exception e) {
            return null;
        }
    }

    static synchronized void setSession(Context c, Session s) {
        try {
            p(c).edit().putString(K_SESSION, s == null ? "" : s.toJson().toString()).commit();
        } catch (Exception ignored) {
        }
    }

    /* ---------------- antrean aksi ---------------- */

    static synchronized JSONArray queue(Context c) {
        try {
            return new JSONArray(p(c).getString(K_QUEUE, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /**
     * Antrean & sesi ditulis SINKRON (commit, bukan apply): listrik bilik bisa padam kapan saja, dan
     * aksi yang hilang sebelum sempat tertulis = sesi yang tidak pernah tertagih.
     */
    private static void saveQueue(Context c, JSONArray q) {
        p(c).edit().putString(K_QUEUE, q.toString()).commit();
    }

    /** Menambah aksi Mode Offline ke antrean (dikirim PollService begitu online). */
    static synchronized JSONObject enqueue(Context c, String kind, String sessionId, long atServerMs, JSONObject extra) {
        try {
            JSONObject a = new JSONObject()
                    .put("id", UUID.randomUUID().toString())
                    .put("kind", kind)
                    .put("at", iso(atServerMs))
                    .put("clockOffsetMs", clockOffset(c))
                    .put("sessionId", sessionId)
                    .put("token", StateRepo.token(c))
                    .put("attempts", 0);
            if (extra != null) {
                JSONArray names = extra.names();
                for (int i = 0; names != null && i < names.length(); i++) a.put(names.getString(i), extra.get(names.getString(i)));
            }
            JSONArray q = queue(c);
            q.put(a);
            saveQueue(c, q);
            return a;
        } catch (Exception e) {
            return null;
        }
    }

    static synchronized void removeActions(Context c, java.util.Set<String> ids) {
        JSONArray q = queue(c);
        JSONArray out = new JSONArray();
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && !ids.contains(a.optString("id"))) out.put(a);
        }
        saveQueue(c, out);
    }

    static synchronized void markFailed(Context c, String id, String error) {
        JSONArray q = queue(c);
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && id.equals(a.optString("id"))) {
                try {
                    a.put("attempts", a.optInt("attempts", 0) + 1).put("error", error == null ? "" : error);
                } catch (Exception ignored) {
                }
            }
        }
        saveQueue(c, q);
    }

    /** Aksi yang menunggu dikirim (belum melewati batas percobaan). */
    static synchronized int pendingCount(Context c) {
        JSONArray q = queue(c);
        int n = 0;
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && a.optInt("attempts", 0) < MAX_ATTEMPTS) n++;
        }
        return n;
    }

    static synchronized int failedCount(Context c) {
        return queue(c).length() - pendingCount(c);
    }

    /** Masih ada aksi untuk sesi ini yang belum diterima server. */
    static synchronized boolean hasPendingFor(Context c, String sessionId) {
        JSONArray q = queue(c);
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && sessionId.equals(a.optString("sessionId"))) return true;
        }
        return false;
    }

    /** Aksi "start" sesi ini sudah ditolak server setidaknya sekali (sesi belum tercatat di dashboard). */
    static synchronized boolean startRejected(Context c, String sessionId) {
        JSONArray q = queue(c);
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && sessionId.equals(a.optString("sessionId")) && "start".equals(a.optString("kind")) && a.optInt("attempts", 0) > 0) return true;
        }
        return false;
    }

    /** Hapus aksi yang gagal (ditinjau kasir/owner) — tetap tercatat sebagai gagal di server bila pernah sampai. */
    static synchronized void dropFailed(Context c) {
        JSONArray q = queue(c);
        JSONArray out = new JSONArray();
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && a.optInt("attempts", 0) < MAX_ATTEMPTS) out.put(a);
        }
        saveQueue(c, out);
    }

    /** Coba lagi aksi yang sudah melewati batas (mis. setelah owner memperbaiki di dashboard). */
    static synchronized void retryFailed(Context c) {
        JSONArray q = queue(c);
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null) {
                try {
                    a.put("attempts", 0);
                } catch (Exception ignored) {
                }
            }
        }
        saveQueue(c, q);
    }

    static synchronized String failedSummary(Context c) {
        JSONArray q = queue(c);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a == null || a.optInt("attempts", 0) < MAX_ATTEMPTS) continue;
            sb.append("• ").append(a.optString("kind")).append(" ").append(a.optString("at").replace('T', ' ').replace("Z", "").substring(0, Math.min(16, a.optString("at").length())))
                    .append(": ").append(a.optString("error", "")).append('\n');
        }
        return sb.toString().trim();
    }

    static long lastSyncWall(Context c) {
        return p(c).getLong(K_LAST_SYNC, 0L);
    }

    static void setLastSync(Context c, long wall, String error) {
        p(c).edit().putLong(K_LAST_SYNC, wall).putString(K_LAST_SYNC_ERROR, error == null ? "" : error).apply();
    }

    static String lastSyncError(Context c) {
        return p(c).getString(K_LAST_SYNC_ERROR, "");
    }

    /* ---------------- kejadian non-tagihan (mode staf / tes) ---------------- */

    private static final String K_EVENTS = "event_queue";
    private static final String K_TEST_DAY = "staff_test_day";
    private static final String K_TEST_COUNT = "staff_test_count";
    /** Mode staf (tes, tidak ditagih) paling banyak sekian kali per TV per hari (kalender TV). */
    static final int STAFF_TEST_PER_DAY = 3;

    static synchronized JSONArray events(Context c) {
        try {
            return new JSONArray(p(c).getString(K_EVENTS, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static String today() {
        return new SimpleDateFormat("yyyyMMdd", Locale.ROOT).format(new Date());
    }

    /** Sisa jatah mode staf hari ini. */
    static synchronized int staffTestsLeft(Context c) {
        int used = today().equals(p(c).getString(K_TEST_DAY, "")) ? p(c).getInt(K_TEST_COUNT, 0) : 0;
        return Math.max(0, STAFF_TEST_PER_DAY - used);
    }

    /**
     * Mencatat pemakaian mode staf (dikirim ke dashboard — kartu Pengawasan NEXBILL TV) dan menghitung
     * jatah harian. false bila jatah hari ini habis.
     */
    static synchronized boolean recordStaffTest(Context c, int minutes) {
        if (staffTestsLeft(c) <= 0) return false;
        String day = today();
        int used = day.equals(p(c).getString(K_TEST_DAY, "")) ? p(c).getInt(K_TEST_COUNT, 0) : 0;
        try {
            JSONObject e = new JSONObject()
                    .put("id", UUID.randomUUID().toString())
                    .put("kind", "staffTest")
                    .put("at", iso(serverNow(c)))
                    .put("minutes", minutes)
                    .put("token", StateRepo.token(c));
            JSONArray q = events(c);
            q.put(e);
            p(c).edit().putString(K_EVENTS, q.toString()).putString(K_TEST_DAY, day).putInt(K_TEST_COUNT, used + 1).commit();
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    static synchronized void removeEvents(Context c, java.util.Set<String> ids) {
        JSONArray q = events(c);
        JSONArray out = new JSONArray();
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && !ids.contains(a.optString("id"))) out.put(a);
        }
        p(c).edit().putString(K_EVENTS, out.toString()).commit();
    }

    /* ---------------- katalog & status terakhir ---------------- */

    static JSONObject catalog(Context c) {
        try {
            String raw = p(c).getString(K_CATALOG, "");
            return raw.isEmpty() ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    static long catalogAt(Context c) {
        return p(c).getLong(K_CATALOG_AT, 0L);
    }

    static void setCatalog(Context c, String json) {
        p(c).edit().putString(K_CATALOG, json).putLong(K_CATALOG_AT, System.currentTimeMillis()).apply();
    }

    /** Balasan /api/tv/state terakhir — dipulihkan saat TV menyala ulang tanpa internet. */
    static void saveState(Context c, String json) {
        p(c).edit().putString(K_STATE, json).putLong(K_STATE_WALL, System.currentTimeMillis()).apply();
    }

    static String savedState(Context c) {
        return p(c).getString(K_STATE, "");
    }

    static long savedStateWall(Context c) {
        return p(c).getLong(K_STATE_WALL, 0L);
    }

    /** Layar dipasangkan ulang / dilepas: data layar lama dibuang (antrean yang belum terkirim tetap). */
    static void clearForNewScreen(Context c) {
        p(c).edit().remove(K_SESSION).remove(K_CATALOG).remove(K_CATALOG_AT).remove(K_STATE).remove(K_STATE_WALL).apply();
    }
}
