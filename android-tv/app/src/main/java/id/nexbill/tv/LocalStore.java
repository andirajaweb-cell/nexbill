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
        /**
         * Cerminan sesi dashboard yang sedang DIJEDA (tambah waktu/stop dari TV): layar tetap terkunci.
         * Tanpa ini, menambah waktu pada sesi yang dijeda membuka layar game sampai server membalas.
         */
        boolean paused;

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
            return !ended && !paused && serverNow < endAt();
        }

        JSONObject toJson() throws Exception {
            return new JSONObject()
                    .put("sessionId", sessionId)
                    .put("startAt", startAt)
                    .put("plannedMinutes", plannedMinutes)
                    .put("extendedMinutes", extendedMinutes)
                    .put("label", label == null ? "" : label)
                    .put("priceEstimate", priceEstimate)
                    .put("ended", ended)
                    .put("paused", paused);
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
            s.paused = o.optBoolean("paused", false);
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
            // PIN per staf: aksi dicatat atas nama kasir yang mengetik PIN-nya di TV.
            if (!StateRepo.cashierId().isEmpty()) a.put("staffId", StateRepo.cashierId());
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

    /** Aksi sesi ini yang sudah ditolak server sampai batas percobaan (perlu ditinjau kasir/owner). */
    static synchronized boolean hasFailedFor(Context c, String sessionId) {
        JSONArray q = queue(c);
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a != null && sessionId.equals(a.optString("sessionId")) && a.optInt("attempts", 0) >= MAX_ATTEMPTS) return true;
        }
        return false;
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
        java.util.Set<String> droppedSessions = new java.util.HashSet<>();
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a == null) continue;
            if (a.optInt("attempts", 0) < MAX_ATTEMPTS) out.put(a);
            else droppedSessions.add(a.optString("sessionId", ""));
        }
        saveQueue(c, out);
        historyMarkDropped(c, droppedSessions);
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

    /* ---------------- riwayat sesi (ditampilkan di panel kasir) ---------------- */

    private static final String K_HISTORY = "session_history";
    /** Riwayat disimpan sekian hari (cukup untuk "Bulan lalu") dan paling banyak sekian baris. */
    static final int HISTORY_DAYS = 62;
    private static final int HISTORY_MAX = 1000;

    /**
     * Satu baris riwayat sesi unit layar ini. source "tv" = dimulai dari TV; "dashboard" = dimulai dari
     * dashboard dan terlihat oleh TV (status server). tvActions = ada aksi dari TV (mulai/tambah/akhiri)
     * yang harus dikirim ke dashboard — status kirimnya dihitung dari antrean (lihat historyState).
     */
    static final class HistoryEntry {
        String sessionId;
        String source;
        long startAt;
        /** 0 = masih berjalan. */
        long endAt;
        int plannedMinutes;
        int extendedMinutes;
        String label;
        long priceEstimate;
        long ratePerHour;
        boolean tvActions;
        /** Jam (server) saat aksi terakhir sesi ini diterima dashboard; 0 = belum/tidak perlu. */
        long sentAt;
        /** Aksi yang ditolak lalu dihapus dari TV — sesi ini tidak pernah sampai ke dashboard. */
        boolean dropped;
        String outletName;
        String unitName;

        JSONObject toJson() throws Exception {
            return new JSONObject().put("sessionId", sessionId).put("source", source).put("startAt", startAt).put("endAt", endAt)
                    .put("plannedMinutes", plannedMinutes).put("extendedMinutes", extendedMinutes).put("label", label == null ? "" : label)
                    .put("priceEstimate", priceEstimate).put("ratePerHour", ratePerHour).put("tvActions", tvActions).put("sentAt", sentAt)
                    .put("dropped", dropped).put("outletName", outletName == null ? "" : outletName).put("unitName", unitName == null ? "" : unitName);
        }

        static HistoryEntry fromJson(JSONObject o) {
            HistoryEntry e = new HistoryEntry();
            e.sessionId = o.optString("sessionId", "");
            e.source = o.optString("source", "tv");
            e.startAt = o.optLong("startAt", 0L);
            e.endAt = o.optLong("endAt", 0L);
            e.plannedMinutes = o.optInt("plannedMinutes", 0);
            e.extendedMinutes = o.optInt("extendedMinutes", 0);
            e.label = o.optString("label", "");
            e.priceEstimate = o.optLong("priceEstimate", 0L);
            e.ratePerHour = o.optLong("ratePerHour", 0L);
            e.tvActions = o.optBoolean("tvActions", false);
            e.sentAt = o.optLong("sentAt", 0L);
            e.dropped = o.optBoolean("dropped", false);
            e.outletName = o.optString("outletName", "");
            e.unitName = o.optString("unitName", "");
            return e;
        }

        /** Lama main (menit) sampai endAt, atau sampai "now" bila masih berjalan. */
        long minutes(long now) {
            long end = endAt > 0 ? endAt : now;
            return Math.max(0, (end - startAt) / 60_000L);
        }

        /** Perkiraan tagihan (bukan nilai final kasir): harga paket/durasi + tambahan waktu, atau tarif × lama main. */
        long estimate(long now) {
            if (priceEstimate > 0) return priceEstimate + Math.round(ratePerHour * extendedMinutes / 60.0);
            return Math.round(ratePerHour * minutes(now) / 60.0);
        }
    }

    static synchronized java.util.List<HistoryEntry> history(Context c) {
        java.util.List<HistoryEntry> out = new java.util.ArrayList<>();
        try {
            JSONArray a = new JSONArray(p(c).getString(K_HISTORY, "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.optJSONObject(i);
                if (o != null) out.add(HistoryEntry.fromJson(o));
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    private static void saveHistory(Context c, java.util.List<HistoryEntry> list) {
        long cutoff = serverNow(c) - HISTORY_DAYS * 86_400_000L;
        JSONArray a = new JSONArray();
        int skip = Math.max(0, list.size() - HISTORY_MAX);
        for (int i = skip; i < list.size(); i++) {
            HistoryEntry e = list.get(i);
            if (e.startAt < cutoff && (e.endAt > 0 || e.startAt <= 0)) continue;
            try {
                a.put(e.toJson());
            } catch (Exception ignored) {
            }
        }
        p(c).edit().putString(K_HISTORY, a.toString()).apply();
    }

    private static HistoryEntry find(java.util.List<HistoryEntry> list, String sessionId) {
        for (HistoryEntry e : list) if (e.sessionId.equals(sessionId)) return e;
        return null;
    }

    private static void stampPlace(Context c, HistoryEntry e) {
        JSONObject cat = catalog(c);
        TvState s = StateRepo.state();
        if (e.outletName == null || e.outletName.isEmpty()) {
            e.outletName = s != null && s.outletName != null && !s.outletName.isEmpty() ? s.outletName : cat != null ? cat.optString("outletName", "") : "";
        }
        if (e.unitName == null || e.unitName.isEmpty()) {
            JSONObject unit = cat != null ? cat.optJSONObject("unit") : null;
            e.unitName = s != null && s.unitName != null && !s.unitName.isEmpty() ? s.unitName : unit != null ? unit.optString("name", "") : "";
        }
        if (e.ratePerHour <= 0) {
            JSONObject unit = cat != null ? cat.optJSONObject("unit") : null;
            e.ratePerHour = unit != null ? unit.optLong("ratePerHour", 0L) : 0L;
        }
    }

    /**
     * Mencatat/memperbarui riwayat dari sesi yang diatur di TV (mulai, tambah waktu, akhiri, habis).
     * endAt 0 = sesi masih berjalan.
     */
    static synchronized void historyFromSession(Context c, Session l, String sourceIfNew, long endAt) {
        if (l == null || l.sessionId == null || l.sessionId.isEmpty()) return;
        java.util.List<HistoryEntry> list = history(c);
        HistoryEntry e = find(list, l.sessionId);
        if (e == null) {
            e = new HistoryEntry();
            e.sessionId = l.sessionId;
            e.source = sourceIfNew;
            e.startAt = l.startAt;
            list.add(e);
        }
        if (e.startAt <= 0) e.startAt = l.startAt;
        e.plannedMinutes = Math.max(e.plannedMinutes, l.plannedMinutes);
        e.extendedMinutes = Math.max(e.extendedMinutes, l.extendedMinutes);
        if (l.label != null && !l.label.isEmpty()) e.label = l.label;
        if (l.priceEstimate > 0) e.priceEstimate = l.priceEstimate;
        if (endAt > 0) e.endAt = endAt;
        e.tvActions = true;
        stampPlace(c, e);
        saveHistory(c, list);
    }

    /**
     * Sesi yang terlihat di status server (termasuk yang dimulai dari dashboard). Sesi berjalan yang tidak
     * lagi dilaporkan server — dan bukan sesi lokal yang sedang berjalan di TV — dicatat selesai.
     */
    static synchronized void observeServerState(Context c, TvState st) {
        if (st == null) return;
        long now = serverNow(c);
        java.util.List<HistoryEntry> list = history(c);
        boolean changed = false;
        String current = st.sessionId != null && !st.sessionId.isEmpty() && st.inSession() ? st.sessionId : null;
        if (current != null) {
            HistoryEntry e = find(list, current);
            long elapsed = st.elapsedSeconds == null ? 0 : st.elapsedSeconds;
            if (e == null) {
                e = new HistoryEntry();
                e.sessionId = current;
                e.source = "dashboard";
                e.startAt = now - elapsed * 1000L;
                list.add(e);
                stampPlace(c, e);
                changed = true;
            }
            if ("dashboard".equals(e.source) && st.remainingSeconds != null) {
                int planned = (int) Math.round((elapsed + st.remainingSeconds) / 60.0);
                if (planned != e.plannedMinutes + e.extendedMinutes && planned > 0) {
                    e.plannedMinutes = planned - e.extendedMinutes;
                    changed = true;
                }
            }
            if (e.endAt > 0 && e.endAt < now - 60_000L) {
                // Dibuka kembali di dashboard (mis. sinkron offline) → berjalan lagi.
                e.endAt = 0;
                changed = true;
            }
        }
        Session local = session(c);
        String localRunning = local != null && !local.ended ? local.sessionId : null;
        for (HistoryEntry e : list) {
            if (e.endAt > 0 || e.sessionId.equals(current) || e.sessionId.equals(localRunning)) continue;
            if (hasPendingFor(c, e.sessionId)) continue;
            e.endAt = now;
            changed = true;
        }
        if (changed) saveHistory(c, list);
    }

    /** Dipanggil SyncEngine: semua aksi sesi ini sudah diterima dashboard. */
    static synchronized void historyMarkSent(Context c, java.util.Set<String> sessionIds) {
        if (sessionIds.isEmpty()) return;
        java.util.List<HistoryEntry> list = history(c);
        long now = serverNow(c);
        boolean changed = false;
        for (String id : sessionIds) {
            if (hasPendingFor(c, id)) continue;
            HistoryEntry e = find(list, id);
            if (e == null) continue;
            e.sentAt = now;
            e.dropped = false;
            changed = true;
        }
        if (changed) saveHistory(c, list);
    }

    private static synchronized void historyMarkDropped(Context c, java.util.Set<String> sessionIds) {
        if (sessionIds.isEmpty()) return;
        java.util.List<HistoryEntry> list = history(c);
        boolean changed = false;
        for (String id : sessionIds) {
            if (hasPendingFor(c, id)) continue;
            HistoryEntry e = find(list, id);
            if (e != null) {
                e.dropped = true;
                changed = true;
            }
        }
        if (changed) saveHistory(c, list);
    }

    /** Status kirim ke dashboard untuk satu baris riwayat. */
    enum SyncState { SENT, PENDING, FAILED, DROPPED, DASHBOARD }

    static synchronized SyncState historyState(Context c, HistoryEntry e) {
        if (hasFailedFor(c, e.sessionId)) return SyncState.FAILED;
        if (hasPendingFor(c, e.sessionId)) return SyncState.PENDING;
        if (e.dropped) return SyncState.DROPPED;
        if (!e.tvActions && "dashboard".equals(e.source)) return SyncState.DASHBOARD;
        return SyncState.SENT;
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
