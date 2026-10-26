package id.nexbill.tv;

import android.content.Context;
import android.provider.Settings;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Sidik TV ini untuk server (1.2.2): SHA-256 dari ANDROID_ID, 32 karakter hex. ANDROID_ID sendiri tidak
 * pernah dikirim. Nilainya tetap walau aplikasi dipasang ulang atau datanya dihapus (kunci tanda tangan
 * sama), dan baru berubah setelah TV di-reset pabrik.
 *
 * Dipakai server untuk memastikan SATU TV hanya terhubung ke SATU outlet: pairing ke outlet lain ditolak
 * selama TV ini masih terdaftar di outlet pertamanya (lib/tv/device-binding.ts).
 */
final class DeviceId {
    private static volatile String cached;

    private DeviceId() {}

    static void init(Context c) {
        if (cached != null) return;
        try {
            String raw = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.ANDROID_ID);
            if (raw == null || raw.isEmpty()) return;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] h = md.digest(("nexbill-tv:" + raw).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 16; i++) sb.append(String.format(java.util.Locale.ROOT, "%02x", h[i]));
            cached = sb.toString();
        } catch (Exception ignored) {
            // tanpa sidik: server memperlakukan TV seperti versi lama (tanpa ikatan)
        }
    }

    /** "" bila belum diinisialisasi / tidak tersedia. */
    static String get() {
        String v = cached;
        return v == null ? "" : v;
    }
}
