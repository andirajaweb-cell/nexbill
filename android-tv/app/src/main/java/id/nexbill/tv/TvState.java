package id.nexbill.tv;

import android.content.Context;

import org.json.JSONObject;

/**
 * Potongan balasan /api/tv/state yang dibutuhkan aplikasi. Sisa waktu dihitung ulang dari jam
 * monotonik TV (SystemClock.elapsedRealtime) sejak balasan diterima, supaya timer tetap berjalan
 * dan layar tetap terkunci tepat waktu walau internet putus di tengah sesi.
 */
final class TvState {
    final boolean enabled;
    /** Alasan layar dimatikan dari dashboard (null bila aktif). */
    final String disabledReason;
    /** available | occupied | paused | maintenance | unknown (lihat lib/tv/view.ts). */
    final String status;
    /** null = sesi terbuka (tanpa batas waktu). */
    final Integer remainingSeconds;
    final Integer elapsedSeconds;
    final boolean timeUp;
    final Integer warnMinutes;
    final boolean requiresPin;
    final String unitName;
    /** Sesi aktif unit ini di server (untuk tambah waktu / stop dari TV); null bila tidak ada. */
    final String sessionId;
    final String outletName;
    /** Jam server saat balasan dibuat (epoch ms, 0 bila tidak ada). */
    final long serverTimeMs;
    final long receivedAt;

    private TvState(boolean enabled, String disabledReason, String status, Integer remainingSeconds, Integer elapsedSeconds, boolean timeUp,
                    Integer warnMinutes, boolean requiresPin, String unitName, String sessionId, String outletName, long serverTimeMs, long receivedAt) {
        this.enabled = enabled;
        this.disabledReason = disabledReason;
        this.status = status;
        this.remainingSeconds = remainingSeconds;
        this.elapsedSeconds = elapsedSeconds;
        this.timeUp = timeUp;
        this.warnMinutes = warnMinutes;
        this.requiresPin = requiresPin;
        this.unitName = unitName;
        this.sessionId = sessionId;
        this.outletName = outletName;
        this.serverTimeMs = serverTimeMs;
        this.receivedAt = receivedAt;
    }

    static TvState parse(String json, long receivedAt) throws Exception {
        JSONObject o = new JSONObject(json);
        JSONObject view = o.optJSONObject("view");
        JSONObject display = o.optJSONObject("display");
        String status = view != null ? view.optString("status", "unknown") : "unknown";
        Integer remaining = view != null && view.has("remainingSeconds") && !view.isNull("remainingSeconds")
                ? view.getInt("remainingSeconds") : null;
        Integer elapsed = view != null && view.has("elapsedSeconds") && !view.isNull("elapsedSeconds")
                ? view.getInt("elapsedSeconds") : null;
        Integer warn = display != null && display.has("timeWarningMinutes") && !display.isNull("timeWarningMinutes")
                ? display.getInt("timeWarningMinutes") : null;
        boolean requiresPin = display != null && display.optBoolean("requiresPin", false);
        String unitName = o.isNull("unitName") ? "" : o.optString("unitName", "");
        String reason = o.isNull("disabledReason") ? null : o.optString("disabledReason", null);
        String sessionId = o.isNull("sessionId") ? null : o.optString("sessionId", null);
        String outletName = o.isNull("outletName") ? "" : o.optString("outletName", "");
        long serverTime = LocalStore.parseIso(o.optString("serverTime", ""));
        return new TvState(o.optBoolean("enabled", false), reason, status, remaining, elapsed, o.optBoolean("timeUp", false),
                warn, requiresPin, unitName, sessionId, outletName, serverTime, receivedAt);
    }

    boolean inSession() {
        return "occupied".equals(status) || "paused".equals(status);
    }

    /** Sisa detik saat ini (tidak pernah negatif); null untuk sesi terbuka. Sesi dijeda membeku. */
    Integer liveRemaining(long nowRealtime) {
        if (remainingSeconds == null) return null;
        if ("paused".equals(status)) return remainingSeconds;
        long passed = Math.max(0, (nowRealtime - receivedAt) / 1000);
        return (int) Math.max(0, remainingSeconds - passed);
    }

    long liveElapsed(long nowRealtime) {
        long base = elapsedSeconds == null ? 0 : elapsedSeconds;
        if ("paused".equals(status)) return base;
        return base + Math.max(0, (nowRealtime - receivedAt) / 1000);
    }

    /**
     * Layar game (HDMI) boleh tampil: ada sesi BERJALAN (bukan dijeda — 1.2.2: jeda dari dashboard mengunci
     * layar supaya tidak bisa main gratis selama argo berhenti), bukan Waktu Habis, dan waktunya belum habis.
     * Layar yang DIMATIKAN dari dashboard (enabled=false) tidak mengunci apa pun — aplikasi menjadi pasif
     * dan HDMI selalu tampil, supaya mematikan fitur tidak membuat bilik terkunci sepanjang hari.
     */
    boolean shouldShowGame(long nowRealtime) {
        if (!enabled) return true;
        if (timeUp || !"occupied".equals(status)) return false;
        Integer r = liveRemaining(nowRealtime);
        return r == null || r > 0;
    }

    boolean isWarning(long nowRealtime) {
        Integer r = liveRemaining(nowRealtime);
        return warnMinutes != null && r != null && r > 0 && r <= warnMinutes * 60 && "occupied".equals(status);
    }

    /** Teks timer kecil di pojok layar game. */
    static String timerText(Context ctx, TvState s, long now, long staffLeftMs) {
        LocalStore.Session l = StateRepo.localAuthority(ctx, now);
        if (l != null && l.active(LocalStore.serverNow(ctx))) {
            long sn = LocalStore.serverNow(ctx);
            Integer r = l.remainingSeconds(sn);
            return r == null ? "▶ " + clock(l.elapsedSeconds(sn)) : clock(r);
        }
        if (staffLeftMs > 0 && (s == null || !s.shouldShowGame(now))) {
            return ctx.getString(R.string.timer_staff) + "  " + clock(staffLeftMs / 1000);
        }
        if (s == null) return "";
        if ("paused".equals(s.status)) return ctx.getString(R.string.timer_paused);
        Integer r = s.liveRemaining(now);
        if (r == null) return "▶ " + clock(s.liveElapsed(now));
        return clock(r);
    }

    static String clock(long totalSeconds) {
        long s = Math.max(0, totalSeconds);
        long h = s / 3600, m = (s % 3600) / 60, sec = s % 60;
        return h > 0 ? String.format(java.util.Locale.ROOT, "%d:%02d:%02d", h, m, sec)
                : String.format(java.util.Locale.ROOT, "%02d:%02d", m, sec);
    }
}
