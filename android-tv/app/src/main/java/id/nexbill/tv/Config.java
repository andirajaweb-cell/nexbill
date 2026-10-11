package id.nexbill.tv;

/** Konstanta aplikasi. Alamat server sama dengan dashboard NEXBILL. */
public final class Config {
    public static final String BASE_URL = "https://dashboard.nexbill.id";
    /** Halaman layar bilik yang sudah ada (pairing kode 6 digit + screensaver + layar Waktu Habis). */
    public static final String TV_PAGE = BASE_URL + "/tv?app=1";
    public static final String STATE_URL = BASE_URL + "/api/tv/state";
    public static final String UNLOCK_URL = BASE_URL + "/api/tv/unlock";
    /** WAJIB sama dengan versionName/versionCode di app/build.gradle (dicek otomatis oleh GitHub Actions). */
    public static final String APP_VERSION = "1.0.0";
    public static final int VERSION_CODE = 1;
    /** Info versi terbaru untuk menu staf "Cek pembaruan" (diterbitkan bersama APK). */
    public static final String LATEST_URL = BASE_URL + "/downloads/nexbill-tv/latest.json";
    /** Alamat pendek yang diketik di aplikasi Downloader di TV untuk memasang/memperbarui APK. */
    public static final String INSTALL_SHORT_URL = "nexbill.id/tvapk";

    /** Sama dengan POLL_MS halaman /tv. */
    public static final long POLL_MS = 5_000L;
    /** Lama "mode staf" (layar game dibuka tanpa sesi) setelah PIN benar. */
    public static final long STAFF_BYPASS_MS = 10 * 60_000L;

    private Config() {}
}
