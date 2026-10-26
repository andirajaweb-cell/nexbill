package id.nexbill.tv;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Mengirim antrean aksi sesi dari TV ke /api/tv/sync dan menyegarkan katalog harga/paket. Selalu
 * dipanggil dari thread pekerja PollService (bukan thread UI). Aman dipanggil berulang: server
 * menolak memproses ulang id aksi yang sama.
 */
final class SyncEngine {
    /** Katalog disegarkan paling sering tiap 10 menit (atau segera bila belum ada). */
    private static final long CATALOG_EVERY_MS = 10 * 60_000L;
    private static final String[] PROTOCOL_KEYS = { "id", "kind", "at", "clockOffsetMs", "sessionId", "rentalUnitId", "plannedMinutes", "promoId", "minutes" };

    private SyncEngine() {}

    /**
     * Kirim semua aksi sesi & kejadian (mode staf) yang menunggu, dikelompokkan per token — antrean dari
     * pairing lama tetap terkirim dengan token lamanya.
     */
    static void syncQueue(Context c) {
        JSONArray q = LocalStore.queue(c);
        JSONArray ev = LocalStore.events(c);
        if (q.length() == 0 && ev.length() == 0) return;
        Map<String, JSONArray[]> byToken = new LinkedHashMap<>();
        for (int i = 0; i < q.length(); i++) {
            JSONObject a = q.optJSONObject(i);
            if (a == null || a.optInt("attempts", 0) >= LocalStore.MAX_ATTEMPTS) continue;
            group(c, byToken, a)[0].put(clean(a));
        }
        for (int i = 0; i < ev.length(); i++) {
            JSONObject e = ev.optJSONObject(i);
            if (e == null) continue;
            JSONObject out = new JSONObject();
            try {
                out.put("id", e.optString("id")).put("kind", e.optString("kind")).put("at", e.optString("at")).put("minutes", e.optInt("minutes", 10));
            } catch (Exception ignored) {
            }
            group(c, byToken, e)[1].put(out);
        }
        String lastError = null;
        for (Map.Entry<String, JSONArray[]> entry : byToken.entrySet()) {
            if (entry.getKey().isEmpty()) continue;
            try {
                JSONObject body = new JSONObject()
                        .put("clockOffsetMs", LocalStore.clockOffset(c))
                        .put("actions", entry.getValue()[0])
                        .put("events", entry.getValue()[1]);
                Http.Result r = Http.request("POST", Config.SYNC_URL, entry.getKey(), body.toString());
                if (r.code == 401) {
                    lastError = c.getString(R.string.sync_token_revoked);
                    continue;
                }
                if (r.code != 200) {
                    lastError = "HTTP " + r.code;
                    continue;
                }
                JSONObject resp = new JSONObject(r.body);
                JSONArray results = resp.optJSONArray("results");
                Set<String> done = new HashSet<>();
                for (int i = 0; results != null && i < results.length(); i++) {
                    JSONObject res = results.optJSONObject(i);
                    if (res == null) continue;
                    String id = res.optString("id", "");
                    String status = res.optString("status", "");
                    if ("done".equals(status) || "duplicate".equals(status)) done.add(id);
                    else if (!id.isEmpty()) LocalStore.markFailed(c, id, res.optString("error", ""));
                }
                LocalStore.removeActions(c, done);
                JSONArray evResults = resp.optJSONArray("events");
                Set<String> evDone = new HashSet<>();
                for (int i = 0; evResults != null && i < evResults.length(); i++) {
                    JSONObject res = evResults.optJSONObject(i);
                    // Kejadian yang ditolak (bentuk salah) juga dibuang — tidak ada yang bisa diperbaiki di TV.
                    if (res != null) evDone.add(res.optString("id", ""));
                }
                LocalStore.removeEvents(c, evDone);
            } catch (Exception ex) {
                // Internet putus di tengah kirim: antrean tetap utuh, dicoba lagi di putaran berikutnya.
                lastError = c.getString(R.string.sync_offline);
                break;
            }
        }
        LocalStore.setLastSync(c, System.currentTimeMillis(), lastError);
        StateRepo.touch();
    }

    private static JSONArray[] group(Context c, Map<String, JSONArray[]> byToken, JSONObject a) {
        String token = a.optString("token", "");
        if (token.isEmpty()) token = StateRepo.token(c);
        JSONArray[] g = byToken.get(token);
        if (g == null) {
            g = new JSONArray[] { new JSONArray(), new JSONArray() };
            byToken.put(token, g);
        }
        return g;
    }

    private static JSONObject clean(JSONObject a) {
        JSONObject out = new JSONObject();
        for (String k : PROTOCOL_KEYS) {
            if (a.has(k) && !a.isNull(k)) {
                try {
                    out.put(k, a.get(k));
                } catch (Exception ignored) {
                }
            }
        }
        return out;
    }

    static void refreshCatalogIfDue(Context c, boolean force) {
        String token = StateRepo.token(c);
        if (token.isEmpty()) return;
        if (!force && LocalStore.catalog(c) != null && System.currentTimeMillis() - LocalStore.catalogAt(c) < CATALOG_EVERY_MS) return;
        try {
            Http.Result r = Http.request("GET", Config.CATALOG_URL, token, null);
            if (r.code == 200) {
                new JSONObject(r.body); // validasi
                LocalStore.setCatalog(c, r.body);
                StateRepo.touch();
            }
        } catch (Exception ignored) {
            // offline — katalog terakhir tetap dipakai
        }
    }
}
