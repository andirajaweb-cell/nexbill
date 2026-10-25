package id.nexbill.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.media.tv.TvContract;
import android.media.tv.TvInputInfo;
import android.media.tv.TvInputManager;
import android.media.tv.TvView;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Layar utama NEXBILL TV.
 *
 * Tiga lapis dalam satu layar:
 *   1. TvView — gambar dari input HDMI tempat konsol dicolok ("layar game").
 *   2. WebView — halaman /tv dashboard NEXBILL: pairing kode 6 digit, screensaver, layar Waktu Habis.
 *   3. Timer kecil di pojok kanan atas saat layar game tampil.
 *
 * Aturannya sederhana: ada sesi berjalan → layar game + timer; tidak ada sesi / waktu habis →
 * halaman /tv menutup layar dan suara HDMI dihentikan. Tidak perlu Developer options, ADB, atau PC.
 *
 * Kalau TV tidak mengizinkan HDMI tampil di dalam aplikasi, aplikasi beralih ke mode "Pindah input
 * TV": TV dipindah ke input HDMI-nya, timer tampil sebagai overlay, dan layar NEXBILL dibawa
 * kembali ke depan saat waktu habis (butuh izin tampil di atas aplikasi lain).
 */
public class MainActivity extends Activity {
    private static final long LONG_PRESS_MS = 2500;
    /** Lama penjaga layar dijeda saat staf membuka Pengaturan TV dari menu staf. */
    private static final long GUARD_PAUSE_MS = 10 * 60_000L;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private TvView tvView;
    private WebView web;
    private TextView timer;
    private TextView hint;

    private String tunedInput;
    private boolean videoAvailable;
    private boolean externalLaunched;
    private long okDownAt;
    private boolean menuOpen;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            render();
            ui.postDelayed(this, 1000);
        }
    };
    private final Runnable onRepoChange = this::render;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        tvView = new TvView(this);
        tvView.setVisibility(View.INVISIBLE);
        root.addView(tvView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        web = new WebView(this);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setUserAgentString(ws.getUserAgentString() + " NexbillTvApp/" + Config.APP_VERSION);
        web.setBackgroundColor(Color.BLACK);
        web.addJavascriptInterface(new Bridge(), "NexbillTvApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Hanya halaman NEXBILL yang boleh dibuka di layar bilik (jembatan JS hanya untuk situs ini).
                Uri u = request.getUrl();
                return u == null || !"dashboard.nexbill.id".equals(u.getHost());
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                ui.postDelayed(() -> web.loadUrl(Config.TV_PAGE), 10_000);
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        timer = new TextView(this);
        timer.setTextSize(22);
        timer.setTypeface(Typeface.DEFAULT_BOLD);
        timer.setTextColor(Color.WHITE);
        timer.setPadding(28, 12, 28, 12);
        timer.setVisibility(View.GONE);
        FrameLayout.LayoutParams tlp = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.END);
        tlp.setMargins(0, 32, 40, 0);
        root.addView(timer, tlp);

        hint = new TextView(this);
        hint.setTextSize(15);
        hint.setTextColor(0xFFE5E7EB);
        hint.setPadding(24, 10, 24, 10);
        hint.setBackground(OverlayTimer.pill(0xB3000000));
        hint.setVisibility(View.GONE);
        FrameLayout.LayoutParams hlp = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.START);
        hlp.setMargins(40, 0, 0, 32);
        root.addView(hint, hlp);

        setContentView(root);

        tvView.setCallback(new TvView.TvInputCallback() {
            @Override
            public void onVideoAvailable(String inputId) {
                videoAvailable = true;
                showHint(null);
            }

            @Override
            public void onVideoUnavailable(String inputId, int reason) {
                videoAvailable = false;
            }

            @Override
            public void onConnectionFailed(String inputId) {
                // TV ini tidak mengizinkan HDMI tampil di dalam aplikasi pihak ketiga.
                tunedInput = null;
                if (!StateRepo.switchInputMode(MainActivity.this)) {
                    StateRepo.setSwitchInputMode(MainActivity.this, true);
                    Toast.makeText(MainActivity.this, R.string.fallback_toast, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onDisconnected(String inputId) {
                tunedInput = null;
            }
        });

        PollService.start(this);
        web.loadUrl(Config.TV_PAGE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        StateRepo.activityVisible = true;
        externalLaunched = false;
        PollService.start(this);
        StateRepo.addListener(onRepoChange);
        ui.removeCallbacks(tick);
        ui.post(tick);
    }

    @Override
    protected void onPause() {
        StateRepo.activityVisible = false;
        StateRepo.removeListener(onRepoChange);
        ui.removeCallbacks(tick);
        releaseHdmi();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        // Termasuk muat-ulang halaman yang dijadwalkan onReceivedError — jangan sampai jalan setelah destroy.
        ui.removeCallbacksAndMessages(null);
        web.destroy();
        super.onDestroy();
    }

    /** ---------------- Tampilan ---------------- */

    private void render() {
        long now = SystemClock.elapsedRealtime();
        if (StateRepo.showGame(now)) showGame(now);
        else showLock();
    }

    private void showGame(long now) {
        String input = chosenInput();
        if (input == null) {
            showLock();
            showHint(getString(R.string.no_hdmi_hint));
            return;
        }
        if (StateRepo.switchInputMode(this)) {
            // Mode "Pindah input TV": TV dipindah ke HDMI; PollService yang menampilkan timer.
            if (!externalLaunched) {
                externalLaunched = true;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, TvContract.buildChannelUriForPassthroughInput(input))
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (ActivityNotFoundException e) {
                    showHint(getString(R.string.not_supported));
                }
            }
            return;
        }
        if (!input.equals(tunedInput)) {
            videoAvailable = false;
            tunedInput = input;
            tvView.tune(input, TvContract.buildChannelUriForPassthroughInput(input));
        }
        tvView.setVisibility(View.VISIBLE);
        web.setVisibility(View.INVISIBLE);
        TvState s = StateRepo.state();
        timer.setText(TvState.timerText(this, s, now, StateRepo.staffLeftMs(now)));
        timer.setBackground(OverlayTimer.pill(s != null && s.isWarning(now) ? 0xE6B91C1C : 0xB3000000));
        timer.setVisibility(View.VISIBLE);
        if (s != null && !s.enabled) {
            showHint(getString(R.string.disabled_hint) + (s.disabledReason == null ? "" : " " + s.disabledReason));
            timer.setVisibility(View.GONE);
        } else if (!videoAvailable) {
            showHint(getString(R.string.waiting_signal));
        }
    }

    private void showLock() {
        releaseHdmi();
        externalLaunched = false;
        timer.setVisibility(View.GONE);
        if (web.getVisibility() != View.VISIBLE) {
            web.setVisibility(View.VISIBLE);
            web.requestFocus();
        }
        // Penjaga layar butuh izin "tampil di atas aplikasi lain" untuk kembali ke depan dari latar.
        boolean guardBlocked = StateRepo.guardEnabled(this) && !StateRepo.token(this).isEmpty() && !OverlayTimer.permitted(this);
        showHint(guardBlocked ? getString(R.string.guard_need_overlay) : null);
    }

    /** Menghentikan gambar DAN suara HDMI — TvView yang hanya disembunyikan tetap memutar suara. */
    private void releaseHdmi() {
        if (tunedInput != null) {
            tvView.reset();
            tunedInput = null;
        }
        tvView.setVisibility(View.INVISIBLE);
        videoAvailable = false;
    }

    private void showHint(String text) {
        if (text == null || text.isEmpty()) {
            hint.setVisibility(View.GONE);
        } else {
            hint.setText(text);
            hint.setVisibility(View.VISIBLE);
        }
    }

    /** ---------------- Input HDMI ---------------- */

    private List<TvInputInfo> cachedInputs;
    private long cachedInputsAt;

    /** Daftar input dibaca ulang paling sering tiap 10 detik — render() berjalan setiap detik. */
    private List<TvInputInfo> hdmiInputsCached() {
        long now = SystemClock.elapsedRealtime();
        if (cachedInputs == null || now - cachedInputsAt > 10_000) {
            cachedInputs = hdmiInputs();
            cachedInputsAt = now;
        }
        return cachedInputs;
    }

    private List<TvInputInfo> hdmiInputs() {
        List<TvInputInfo> out = new ArrayList<>();
        TvInputManager tim = (TvInputManager) getSystemService(Context.TV_INPUT_SERVICE);
        if (tim == null) return out;
        try {
            for (TvInputInfo info : tim.getTvInputList()) {
                if (info.getType() == TvInputInfo.TYPE_HDMI || info.isPassthroughInput()) out.add(info);
            }
        } catch (RuntimeException ignored) {
        }
        return out;
    }

    /** Input yang dipilih staf; kalau belum dipilih, HDMI pertama yang ditemukan. */
    private String chosenInput() {
        List<TvInputInfo> inputs = hdmiInputsCached();
        if (inputs.isEmpty()) return null;
        String saved = StateRepo.hdmiInput(this);
        for (TvInputInfo i : inputs) if (i.getId().equals(saved)) return saved;
        return inputs.get(0).getId();
    }

    /** ---------------- Remote & menu staf ---------------- */

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        if (k == KeyEvent.KEYCODE_MENU) {
            if (e.getAction() == KeyEvent.ACTION_UP) openStaffMenu();
            return true;
        }
        if (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER) {
            if (e.getAction() == KeyEvent.ACTION_DOWN) {
                if (e.getRepeatCount() == 0) okDownAt = SystemClock.elapsedRealtime();
                else if (!menuOpen && SystemClock.elapsedRealtime() - okDownAt >= LONG_PRESS_MS) {
                    openStaffMenu();
                    return true;
                }
            }
        }
        if (k == KeyEvent.KEYCODE_BACK) {
            // Tombol Back tidak menutup aplikasi — layar bilik harus tetap NEXBILL.
            if (e.getAction() == KeyEvent.ACTION_UP && web.getVisibility() == View.VISIBLE && web.canGoBack()) web.goBack();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    private void openStaffMenu() {
        if (menuOpen) return;
        TvState s = StateRepo.state();
        // TV yang baru menyala tanpa internet belum punya status dari server: kalau PIN pernah dipakai di
        // sini, tetap minta PIN (mencabut internet tidak boleh membuka menu staf tanpa PIN).
        if ((s != null && s.requiresPin) || (s == null && StateRepo.hasRememberedPin(this))) askPin();
        else showStaffMenu();
    }

    private void askPin() {
        menuOpen = true;
        final EditText pin = new EditText(this);
        pin.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        new AlertDialog.Builder(this)
                .setTitle(R.string.pin_title)
                .setView(pin)
                .setPositiveButton(R.string.ok, (d, w) -> checkPin(pin.getText().toString()))
                .setNegativeButton(R.string.cancel, (d, w) -> menuOpen = false)
                .setOnCancelListener(d -> menuOpen = false)
                .show();
    }

    /** Percobaan PIN offline yang salah berturut-turut; dikunci 5 menit setelah 5 kali. */
    private int offlinePinFails;
    private long offlinePinLockedUntil;

    private void checkPin(final String pin) {
        final String token = StateRepo.token(this);
        new Thread(() -> {
            boolean ok;
            boolean failed = false;
            try {
                JSONObject body = new JSONObject().put("pin", pin);
                Http.Result r = Http.request("POST", Config.UNLOCK_URL, token, body.toString());
                if (r.code >= 500) throw new java.io.IOException("server " + r.code);
                ok = r.code == 200 && new JSONObject(r.body).optBoolean("ok", false);
                // PIN benar menurut server → diingat untuk dipakai saat internet putus.
                if (ok) StateRepo.rememberPin(this, pin);
            } catch (Exception e) {
                // Internet / server tidak terjangkau: cocokkan dengan PIN yang terakhir dinyatakan benar.
                failed = true;
                long now = SystemClock.elapsedRealtime();
                if (now < offlinePinLockedUntil) {
                    ok = false;
                } else {
                    ok = StateRepo.matchesRememberedPin(this, pin);
                    if (ok) {
                        offlinePinFails = 0;
                    } else if (++offlinePinFails >= 5) {
                        offlinePinFails = 0;
                        offlinePinLockedUntil = now + 5 * 60_000L;
                    }
                }
            }
            final boolean pass = ok;
            final boolean offline = failed;
            final boolean noMemory = failed && !StateRepo.hasRememberedPin(this);
            ui.post(() -> {
                menuOpen = false;
                if (pass) {
                    if (offline) Toast.makeText(this, R.string.pin_offline_ok, Toast.LENGTH_SHORT).show();
                    showStaffMenu();
                } else if (noMemory) {
                    Toast.makeText(this, R.string.pin_error, Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(this, R.string.pin_wrong, Toast.LENGTH_SHORT).show();
                }
            });
        }).start();
    }

    private void showStaffMenu() {
        menuOpen = true;
        boolean switchMode = StateRepo.switchInputMode(this);
        String[] items = new String[] {
                getString(R.string.menu_show_game),
                getString(R.string.menu_end_staff),
                getString(R.string.menu_pick_hdmi),
                getString(R.string.menu_mode) + ": " + getString(switchMode ? R.string.mode_switch : R.string.mode_inapp),
                getString(R.string.menu_overlay),
                getString(R.string.menu_home),
                getString(R.string.menu_guard) + ": " + getString(StateRepo.guardEnabled(this) ? R.string.guard_on : R.string.guard_off),
                getString(R.string.menu_reload),
                getString(R.string.menu_update),
                getString(R.string.menu_info),
        };
        new AlertDialog.Builder(this)
                .setTitle(R.string.menu_title)
                .setItems(items, (d, which) -> {
                    menuOpen = false;
                    long now = SystemClock.elapsedRealtime();
                    switch (which) {
                        case 0: pickStaffDuration(); break;
                        case 1: StateRepo.setStaffUntil(0); break;
                        case 2: pickHdmi(); break;
                        case 3: pickMode(); break;
                        case 4: openSettings(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()))); break;
                        case 5: openSettings(new Intent(Settings.ACTION_HOME_SETTINGS)); break;
                        case 6: toggleGuard(); break;
                        case 7: web.loadUrl(Config.TV_PAGE); break;
                        case 8: checkUpdate(); break;
                        default: showInfo(); break;
                    }
                })
                .setOnCancelListener(d -> menuOpen = false)
                .show();
    }

    /**
     * "Buka layar game" tanpa sesi: dipakai untuk tes, dan sebagai cadangan saat internet putus (sesi
     * baru tidak sampai ke TV) — staf memilih lamanya sesuai sesi yang dicatat di Mode Offline kasir.
     * Layar terkunci lagi otomatis saat waktunya habis.
     */
    private void pickStaffDuration() {
        final int[] minutes = new int[] { 10, 30, 60, 120, 180 };
        String[] labels = new String[minutes.length];
        for (int i = 0; i < minutes.length; i++) labels[i] = getString(R.string.minutes_fmt, minutes[i]);
        new AlertDialog.Builder(this)
                .setTitle(R.string.staff_duration_title)
                .setItems(labels, (d, which) -> StateRepo.setStaffUntil(SystemClock.elapsedRealtime() + minutes[which] * 60_000L))
                .show();
    }

    private void pickHdmi() {
        final List<TvInputInfo> inputs = hdmiInputs();
        cachedInputs = inputs;
        cachedInputsAt = SystemClock.elapsedRealtime();
        if (inputs.isEmpty()) {
            Toast.makeText(this, R.string.no_hdmi, Toast.LENGTH_LONG).show();
            return;
        }
        String[] labels = new String[inputs.size()];
        for (int i = 0; i < inputs.size(); i++) {
            CharSequence l = inputs.get(i).loadLabel(this);
            labels[i] = (l == null ? inputs.get(i).getId() : l.toString());
        }
        new AlertDialog.Builder(this)
                .setTitle(R.string.pick_hdmi_title)
                .setItems(labels, (d, which) -> {
                    releaseHdmi();
                    StateRepo.setHdmiInput(this, inputs.get(which).getId());
                })
                .show();
    }

    private void pickMode() {
        String[] modes = new String[] { getString(R.string.mode_inapp), getString(R.string.mode_switch) };
        new AlertDialog.Builder(this)
                .setTitle(R.string.menu_mode)
                .setItems(modes, (d, which) -> {
                    releaseHdmi();
                    StateRepo.setSwitchInputMode(this, which == 1);
                    if (which == 1 && !OverlayTimer.permitted(this)) {
                        Toast.makeText(this, R.string.overlay_needed, Toast.LENGTH_LONG).show();
                    }
                })
                .show();
    }

    /** Penjaga layar aktif/nonaktif (menu staf, ber-PIN). Mengaktifkan tanpa izin overlay → diarahkan ke izinnya. */
    private void toggleGuard() {
        boolean on = !StateRepo.guardEnabled(this);
        StateRepo.setGuardEnabled(this, on);
        Toast.makeText(this, on ? R.string.guard_enabled_toast : R.string.guard_disabled_toast, Toast.LENGTH_LONG).show();
        if (on && !OverlayTimer.permitted(this)) {
            Toast.makeText(this, R.string.guard_need_overlay, Toast.LENGTH_LONG).show();
            openSettings(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName())));
        }
    }

    private void openSettings(Intent i) {
        // Staf sengaja keluar ke Pengaturan TV: penjaga layar dijeda 10 menit supaya tidak menarik kembali.
        StateRepo.pauseGuard(SystemClock.elapsedRealtime() + GUARD_PAUSE_MS);
        try {
            startActivity(i);
        } catch (ActivityNotFoundException | SecurityException e) {
            Toast.makeText(this, R.string.not_supported, Toast.LENGTH_LONG).show();
        }
    }

    /**
     * Cek versi terbaru di nexbill.id. Sengaja TIDAK memasang sendiri: aplikasi yang memperbarui diri
     * di luar Google Play dilarang kebijakan Play. Selama dipasang manual, staf cukup memasang ulang
     * lewat aplikasi Downloader dengan alamat yang sama (data & pairing tetap tersimpan).
     */
    private void checkUpdate() {
        new Thread(() -> {
            String msg;
            try {
                Http.Result r = Http.request("GET", Config.LATEST_URL, null, null);
                JSONObject o = new JSONObject(r.body);
                int latest = o.optInt("versionCode", 0);
                String name = o.optString("versionName", "");
                msg = r.code == 200 && latest > Config.VERSION_CODE
                        ? getString(R.string.update_available, name, Config.INSTALL_SHORT_URL)
                        : getString(R.string.update_latest, Config.APP_VERSION);
            } catch (Exception e) {
                msg = getString(R.string.update_error);
            }
            final String text = msg;
            ui.post(() -> new AlertDialog.Builder(this).setTitle(R.string.menu_update).setMessage(text).setPositiveButton(R.string.ok, null).show());
        }).start();
    }

    private void showInfo() {
        String token = StateRepo.token(this);
        TvState s = StateRepo.state();
        String unit = s != null && s.unitName != null && !s.unitName.isEmpty() ? s.unitName : "-";
        String input = chosenInput();
        String msg = getString(R.string.info_version, Config.APP_VERSION) + "\n"
                + (token.isEmpty() ? getString(R.string.info_unpaired) : getString(R.string.info_paired, unit)) + "\n"
                + getString(R.string.info_input, input == null ? "-" : input) + "\n"
                + getString(R.string.info_mode, getString(StateRepo.switchInputMode(this) ? R.string.mode_switch : R.string.mode_inapp)) + "\n"
                + getString(R.string.info_overlay, getString(OverlayTimer.permitted(this) ? R.string.yes : R.string.no)) + "\n"
                + getString(R.string.info_guard, getString(StateRepo.guardEnabled(this) ? R.string.guard_on : R.string.guard_off));
        new AlertDialog.Builder(this).setTitle(R.string.menu_info).setMessage(msg).setPositiveButton(R.string.ok, null).show();
    }

    /** ---------------- Jembatan dari halaman /tv ---------------- */

    private final class Bridge {
        /** Dipanggil halaman /tv setiap kali token layar dipasang ("" saat dilepas). */
        @JavascriptInterface
        public void setToken(String token) {
            StateRepo.setToken(MainActivity.this, token);
        }

        @JavascriptInterface
        public String appVersion() {
            return Config.APP_VERSION;
        }
    }
}
