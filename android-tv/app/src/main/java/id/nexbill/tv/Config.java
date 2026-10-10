package id.nexbill.tv;

/** Konstanta aplikasi. Alamat server sama dengan dashboard NEXBILL. */
public final class Config {
    public static final String BASE_URL = "https://dashboard.nexbill.id";
    /** Halaman layar bilik yang sudah ada (pairing kode 6 digit + screensaver + layar Waktu Habis). */
    public static final String TV_PAGE = BASE_URL + "/tv?app=1";
    public static final String STATE_URL = BASE_URL + "/api/tv/state";
    public static final String UNLOCK_URL = BASE_URL + "/api/tv/unlock";
    public static final String APP_VERSION = "1.0.0";

    /** Sama dengan POLL_MS halaman /tv. */
    public static final long POLL_MS = 5_000L;
    /** Lama "mode staf" (layar game dibuka tanpa sesi) setelah PIN benar. */
    public static final long STAFF_BYPASS_MS = 10 * 60_000L;

    private Config() {}
}
