package id.nexbill.tv;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;

import java.util.Locale;

/**
 * Bahasa aplikasi NEXBILL TV (6 bahasa, sama dengan dashboard): dipilih staf di menu staf atau di layar
 * "Hubungkan TV", disimpan di TV ini. "" = ikut bahasa sistem TV. Kode yang dipakai sama dengan dashboard
 * (id, en, ms, th, fil, vi); resource Android untuk Filipino ada di values-tl.
 */
final class Lang {
    private static final String PREFS = "nexbill_tv";
    private static final String K_LANG = "app_lang";

    /** Kode bahasa yang didukung, urutan tampil di pemilih. */
    static final String[] CODES = { "id", "en", "ms", "th", "fil", "vi" };
    /** Nama tiap bahasa dalam bahasanya sendiri (tidak diterjemahkan). */
    static final String[] NAMES = { "Bahasa Indonesia", "English", "Bahasa Melayu", "ภาษาไทย", "Filipino", "Tiếng Việt" };

    private Lang() {}

    static String chosen(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(K_LANG, "");
    }

    static boolean isSupported(String code) {
        for (String s : CODES) if (s.equals(code)) return true;
        return false;
    }

    static void setChosen(Context c, String code) {
        SharedPreferences p = c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit().putString(K_LANG, code == null || !isSupported(code) ? "" : code).apply();
    }

    /** Bahasa yang sedang berlaku (pilihan staf, atau bahasa sistem bila didukung, selain itu Indonesia). */
    static String effective(Context c) {
        String chosen = chosen(c);
        if (isSupported(chosen)) return chosen;
        String sys = Locale.getDefault().getLanguage();
        if ("tl".equals(sys)) sys = "fil";
        if ("in".equals(sys)) sys = "id";
        return isSupported(sys) ? sys : "id";
    }

    static String displayName(String code) {
        for (int i = 0; i < CODES.length; i++) if (CODES[i].equals(code)) return NAMES[i];
        return code;
    }

    /** Context dengan bahasa pilihan staf (dipakai di attachBaseContext activity & service). */
    static Context wrap(Context base) {
        String chosen = chosen(base);
        if (!isSupported(chosen)) return base;
        Locale locale = new Locale("fil".equals(chosen) ? "tl" : chosen);
        Locale.setDefault(locale);
        Configuration cfg = new Configuration(base.getResources().getConfiguration());
        cfg.setLocale(locale);
        return base.createConfigurationContext(cfg);
    }
}
