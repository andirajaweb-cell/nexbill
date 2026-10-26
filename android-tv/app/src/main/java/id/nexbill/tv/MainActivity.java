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
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.DateFormat;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

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
    /** Screensaver bawaan aplikasi: tampil bila halaman /tv tidak bisa dimuat (internet putus). */
    private LinearLayout offlineView;
    private TextView offlineTitle;
    private TextView offlineUnit;
    private TextView offlineClock;
    private TextView offlineStatus;
    private TextView offlineFooter;
    private boolean webFailed;
    private boolean loadError;
    private boolean okConsumed;

    private String tunedInput;
    private boolean videoAvailable;
    private boolean externalLaunched;
    private long okDownAt;
    private boolean menuOpen;

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            PollService.expireLocalSession(MainActivity.this);
            render();
            ui.postDelayed(this, 1000);
        }
    };
    private final Runnable onRepoChange = this::render;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        DeviceId.init(this);
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
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                loadError = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Halaman /tv termuat tanpa galat → screensaver dari server; galat → screensaver bawaan.
                webFailed = loadError;
                render();
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                loadError = true;
                webFailed = true;
                render();
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

        offlineView = buildOfflineView();
        offlineView.setVisibility(View.GONE);
        root.addView(offlineView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(root);
        StateRepo.restore(this);

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
        if (StateRepo.showGame(this, now)) showGame(now);
        else showLock();
    }

    private boolean startRejectedNow() {
        LocalStore.Session l = LocalStore.session(this);
        return l != null && !l.ended && LocalStore.startRejected(this, l.sessionId);
    }

    /** ---------------- Screensaver bawaan (offline) ---------------- */

    private LinearLayout buildOfflineView() {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        v.setGravity(Gravity.CENTER);
        v.setBackgroundColor(0xFF050914);
        offlineTitle = label(40, Color.WHITE, true);
        offlineUnit = label(26, 0xFF67E8F9, true);
        offlineClock = label(72, Color.WHITE, true);
        offlineStatus = label(28, 0xFF34D399, true);
        offlineFooter = label(16, 0xFF94A3B8, false);
        v.addView(offlineTitle);
        v.addView(offlineUnit);
        v.addView(offlineClock);
        v.addView(offlineStatus);
        v.addView(offlineFooter);
        return v;
    }

    private TextView label(float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        t.setPadding(24, 12, 24, 12);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private void updateOfflineView() {
        boolean paired = !StateRepo.token(this).isEmpty();
        TvState s = StateRepo.state();
        JSONObject cat = LocalStore.catalog(this);
        String outlet = s != null && s.outletName != null && !s.outletName.isEmpty() ? s.outletName : cat != null ? cat.optString("outletName", "NEXBILL") : "NEXBILL";
        JSONObject unit = cat != null ? cat.optJSONObject("unit") : null;
        String unitName = s != null && s.unitName != null && !s.unitName.isEmpty() ? s.unitName : unit != null ? unit.optString("name", "") : "";
        offlineTitle.setText(outlet);
        offlineUnit.setText(unitName);
        offlineClock.setText(DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()));
        if (!paired) {
            offlineStatus.setText(R.string.offline_need_internet_pair);
            offlineStatus.setTextColor(0xFFFBBF24);
        } else {
            LocalStore.Session l = LocalStore.session(this);
            boolean timeUp = (l != null && l.ended) || (s != null && s.timeUp);
            offlineStatus.setText(timeUp ? R.string.offline_time_up : R.string.offline_available);
            offlineStatus.setTextColor(timeUp ? 0xFFF87171 : 0xFF34D399);
        }
        int pending = LocalStore.pendingCount(this);
        String footer = getString(R.string.offline_footer);
        if (pending > 0) footer += "\n" + getString(R.string.offline_pending, pending);
        offlineFooter.setText(footer);
    }

    private void showGame(long now) {
        offlineView.setVisibility(View.GONE);
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
        } else if (startRejectedNow()) {
            // Sesi dari TV ditolak server (mis. unit sudah dipakai sesi lain): tampil jelas di layar supaya
            // kasir segera mencatatnya di dashboard — tanpa itu sesi ini tidak tertagih.
            showHint(getString(R.string.sync_start_rejected_hint));
        } else if (!videoAvailable) {
            showHint(getString(R.string.waiting_signal));
        } else {
            showHint(null);
        }
    }

    private void showLock() {
        releaseHdmi();
        externalLaunched = false;
        timer.setVisibility(View.GONE);
        // Halaman /tv tidak bisa dimuat (internet putus): tampilkan screensaver bawaan aplikasi, bukan
        // halaman galat WebView. Kasir tetap bisa menekan OK untuk mengatur sesi.
        if (webFailed) {
            updateOfflineView();
            offlineView.setVisibility(View.VISIBLE);
        } else {
            offlineView.setVisibility(View.GONE);
        }
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
        boolean paired = !StateRepo.token(this).isEmpty();
        if (k == KeyEvent.KEYCODE_MENU) {
            if (e.getAction() == KeyEvent.ACTION_UP) {
                if (paired) openCashierPanel();
                else openStaffMenu();
            }
            return true;
        }
        if (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER) {
            // Layar belum dipasangkan: tombol OK dipakai halaman pairing (ketik kode 6 digit).
            if (!paired) {
                if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() > 0 && !menuOpen
                        && SystemClock.elapsedRealtime() - okDownAt >= LONG_PRESS_MS) {
                    openStaffMenu();
                    return true;
                }
                if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) okDownAt = SystemClock.elapsedRealtime();
                return super.dispatchKeyEvent(e);
            }
            // Sudah dipasangkan: tekan OK = panel kasir (PIN → mulai sesi / tambah waktu / akhiri).
            if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) okConsumed = false;
            if (e.getAction() == KeyEvent.ACTION_UP && !okConsumed && !menuOpen) {
                okConsumed = true;
                openCashierPanel();
            }
            return true;
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
        if ((s != null && s.requiresPin) || (s == null && StateRepo.hasRememberedPin(this))) askPin(this::showStaffMenu);
        else showStaffMenu();
    }

    private void askPin(final Runnable onSuccess) {
        menuOpen = true;
        final EditText pin = new EditText(this);
        pin.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        new AlertDialog.Builder(this)
                .setTitle(R.string.pin_title)
                .setView(pin)
                .setPositiveButton(R.string.ok, (d, w) -> checkPin(pin.getText().toString(), onSuccess))
                .setNegativeButton(R.string.cancel, (d, w) -> menuOpen = false)
                .setOnCancelListener(d -> menuOpen = false)
                .show();
    }

    /** Percobaan PIN offline yang salah berturut-turut; dikunci 5 menit setelah 5 kali. */
    private int offlinePinFails;
    private long offlinePinLockedUntil;

    private void checkPin(final String pin, final Runnable onSuccess) {
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
                    onSuccess.run();
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
                        case 0: startStaffTest(now); break;
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
     * Mode staf / tes: layar game dibuka 10 menit tanpa sesi & tanpa tagihan. Dibatasi 3 kali per TV per
     * hari dan SELALU dicatat — dikirim ke dashboard (kartu Pengawasan NEXBILL TV & Audit Log) begitu online.
     * Main sungguhan harus lewat panel kasir supaya tertagih.
     */
    private void startStaffTest(long nowRealtime) {
        int minutes = (int) (Config.STAFF_BYPASS_MS / 60_000L);
        if (!LocalStore.recordStaffTest(this, minutes)) {
            message(getString(R.string.staff_test_limit, LocalStore.STAFF_TEST_PER_DAY));
            return;
        }
        StateRepo.setStaffUntil(nowRealtime + Config.STAFF_BYPASS_MS);
        Toast.makeText(this, getString(R.string.staff_test_started, LocalStore.staffTestsLeft(this)), Toast.LENGTH_LONG).show();
        syncSoon();
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

    /** ---------------- Panel kasir: sesi rental dari TV ---------------- */

    /**
     * Tekan OK di remote → PIN kasir → mulai sesi (paket / durasi / bebas), tambah waktu, atau akhiri
     * sesi. Bekerja juga saat internet putus: sesi disimpan di TV dan dikirim otomatis ke
     * dashboard.nexbill.id begitu online (PollService → SyncEngine). Tagihannya masuk ke kasir sebagai
     * Order Terbuka. Tanpa PIN layar di dashboard, sesi tidak bisa dimulai dari TV.
     */
    private void openCashierPanel() {
        if (menuOpen) return;
        TvState s = StateRepo.state();
        boolean needPin = (s != null && s.requiresPin) || (s == null && StateRepo.hasRememberedPin(this));
        if (needPin) askPin(this::showCashierPanel);
        else showCashierPanel();
    }

    private void showCashierPanel() {
        menuOpen = true;
        long now = SystemClock.elapsedRealtime();
        boolean inSession = StateRepo.inSession(this, now);
        int pending = LocalStore.pendingCount(this);
        int failed = LocalStore.failedCount(this);
        final List<String> labels = new ArrayList<>();
        final List<Runnable> actions = new ArrayList<>();
        if (inSession) {
            labels.add(getString(R.string.cashier_extend));
            actions.add(this::extendFlow);
            labels.add(getString(R.string.cashier_stop));
            actions.add(this::stopFlow);
        } else {
            labels.add(getString(R.string.cashier_start));
            actions.add(this::startFlow);
        }
        labels.add(getString(R.string.cashier_sync_status, pending, failed));
        actions.add(this::syncStatusDialog);
        labels.add(getString(R.string.cashier_settings));
        actions.add(this::showStaffMenu);
        TvState s = StateRepo.state();
        JSONObject cat = LocalStore.catalog(this);
        JSONObject unit = cat != null ? cat.optJSONObject("unit") : null;
        String title = getString(R.string.cashier_title) + (unit != null ? " · " + unit.optString("name") : s != null && s.unitName != null ? " · " + s.unitName : "");
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setItems(labels.toArray(new String[0]), (d, which) -> {
                    menuOpen = false;
                    actions.get(which).run();
                })
                .setOnCancelListener(d -> menuOpen = false)
                .show();
    }

    private String rupiah(long n) {
        return "Rp" + NumberFormat.getIntegerInstance(new Locale("id", "ID")).format(n);
    }

    private void startFlow() {
        final JSONObject cat = LocalStore.catalog(this);
        if (cat == null) {
            message(getString(R.string.cashier_no_catalog));
            return;
        }
        if (!cat.optBoolean("canStartFromTv", false)) {
            String reason = cat.isNull("reason") ? "" : cat.optString("reason", "");
            message(getString(R.string.cashier_cannot_start) + (reason.isEmpty() ? "" : "\n\n" + reason));
            return;
        }
        final JSONObject unit = cat.optJSONObject("unit");
        if (unit == null) {
            message(getString(R.string.cashier_cannot_start));
            return;
        }
        final long rate = unit.optLong("ratePerHour", 0L);
        final List<String> labels = new ArrayList<>();
        final List<Object[]> options = new ArrayList<>(); // {minutes, promoId|null, label, price}
        JSONArray pk = cat.optJSONArray("packages");
        for (int i = 0; pk != null && i < pk.length(); i++) {
            JSONObject p = pk.optJSONObject(i);
            if (p == null) continue;
            int m = p.optInt("durationMinutes", 0);
            long price = p.optLong("price", 0L);
            String l = getString(R.string.cashier_package_fmt, p.optString("name"), durationText(m), rupiah(price));
            labels.add(l);
            options.add(new Object[] { m, p.optString("id"), p.optString("name"), price });
        }
        JSONArray du = cat.optJSONArray("durations");
        for (int i = 0; du != null && i < du.length(); i++) {
            JSONObject d = du.optJSONObject(i);
            if (d == null) continue;
            int m = d.optInt("minutes", 0);
            if (m <= 0) continue;
            long price = Math.round(rate * m / 60.0);
            labels.add(getString(R.string.cashier_duration_fmt, durationText(m), rupiah(price)));
            options.add(new Object[] { m, null, durationText(m), price });
        }
        labels.add(getString(R.string.cashier_open_session, rupiah(rate)));
        options.add(new Object[] { 0, null, getString(R.string.cashier_open_label), 0L });
        menuOpen = true;
        new AlertDialog.Builder(this)
                .setTitle(R.string.cashier_pick_title)
                .setItems(labels.toArray(new String[0]), (d, which) -> {
                    menuOpen = false;
                    Object[] o = options.get(which);
                    confirmStart((Integer) o[0], (String) o[1], (String) o[2], (Long) o[3], unit.optString("id"));
                })
                .setOnCancelListener(d -> menuOpen = false)
                .show();
    }

    private void confirmStart(final int minutes, final String promoId, final String label, final long price, final String unitId) {
        String msg = getString(R.string.cashier_confirm_start, label, minutes > 0 ? durationText(minutes) : getString(R.string.cashier_open_label))
                + (price > 0 ? "\n" + getString(R.string.cashier_estimate, rupiah(price)) : "")
                + "\n\n" + getString(R.string.cashier_bill_note);
        new AlertDialog.Builder(this)
                .setTitle(R.string.cashier_start)
                .setMessage(msg)
                .setPositiveButton(R.string.cashier_start_button, (d, w) -> doStart(minutes, promoId, label, price, unitId))
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void doStart(int minutes, String promoId, String label, long price, String unitId) {
        long now = LocalStore.serverNow(this);
        LocalStore.Session l = new LocalStore.Session();
        l.sessionId = UUID.randomUUID().toString();
        l.startAt = now;
        l.plannedMinutes = minutes;
        l.label = label;
        l.priceEstimate = price;
        LocalStore.setSession(this, l);
        try {
            JSONObject extra = new JSONObject().put("rentalUnitId", unitId);
            if (minutes > 0) extra.put("plannedMinutes", minutes);
            if (promoId != null && !promoId.isEmpty()) extra.put("promoId", promoId);
            LocalStore.enqueue(this, "start", l.sessionId, now, extra);
        } catch (Exception ignored) {
        }
        StateRepo.setStaffUntil(0);
        Toast.makeText(this, R.string.cashier_started, Toast.LENGTH_LONG).show();
        syncSoon();
        render();
    }

    /**
     * Sesi yang dimulai dari dashboard (tidak ada sesi lokal): dibuat cerminan lokal dari status server
     * supaya tambah waktu / stop dari TV langsung berlaku di layar walau internet putus.
     */
    private LocalStore.Session sessionForChange() {
        LocalStore.Session l = LocalStore.session(this);
        if (l != null && !l.ended) return l;
        TvState s = StateRepo.state();
        if (s == null || s.sessionId == null || s.sessionId.isEmpty()) return null;
        long nowRt = SystemClock.elapsedRealtime();
        long serverNow = LocalStore.serverNow(this);
        Integer remaining = s.liveRemaining(nowRt);
        long elapsed = s.liveElapsed(nowRt);
        LocalStore.Session m = new LocalStore.Session();
        m.sessionId = s.sessionId;
        m.startAt = serverNow - elapsed * 1000L;
        m.plannedMinutes = remaining == null ? 0 : (int) Math.max(1, Math.round((elapsed + remaining) / 60.0));
        m.label = "";
        return m;
    }

    private void extendFlow() {
        final LocalStore.Session l = sessionForChange();
        if (l == null) {
            message(getString(R.string.cashier_no_session));
            return;
        }
        if (l.plannedMinutes <= 0) {
            message(getString(R.string.cashier_open_no_extend));
            return;
        }
        final int[] mins = { 15, 30, 60, 120 };
        String[] labels = new String[mins.length];
        for (int i = 0; i < mins.length; i++) labels[i] = "+ " + durationText(mins[i]);
        menuOpen = true;
        new AlertDialog.Builder(this)
                .setTitle(R.string.cashier_extend)
                .setItems(labels, (d, which) -> {
                    menuOpen = false;
                    l.extendedMinutes += mins[which];
                    LocalStore.setSession(this, l);
                    try {
                        LocalStore.enqueue(this, "extend", l.sessionId, LocalStore.serverNow(this), new JSONObject().put("minutes", mins[which]));
                    } catch (Exception ignored) {
                    }
                    Toast.makeText(this, getString(R.string.cashier_extended, durationText(mins[which])), Toast.LENGTH_LONG).show();
                    syncSoon();
                    render();
                })
                .setOnCancelListener(d -> menuOpen = false)
                .show();
    }

    private void stopFlow() {
        final LocalStore.Session l = sessionForChange();
        if (l == null) {
            message(getString(R.string.cashier_no_session));
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle(R.string.cashier_stop)
                .setMessage(R.string.cashier_confirm_stop)
                .setPositiveButton(R.string.cashier_stop_button, (d, w) -> {
                    l.ended = true;
                    LocalStore.setSession(this, l);
                    LocalStore.enqueue(this, "stop", l.sessionId, LocalStore.serverNow(this), null);
                    Toast.makeText(this, R.string.cashier_stopped, Toast.LENGTH_LONG).show();
                    syncSoon();
                    render();
                })
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void syncStatusDialog() {
        int pending = LocalStore.pendingCount(this);
        int failed = LocalStore.failedCount(this);
        long last = LocalStore.lastSyncWall(this);
        String err = LocalStore.lastSyncError(this);
        StringBuilder msg = new StringBuilder();
        msg.append(getString(R.string.sync_pending, pending)).append('\n');
        msg.append(getString(R.string.sync_last, last > 0 ? DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(new Date(last)) : "-"));
        if (!err.isEmpty()) msg.append('\n').append(err);
        if (failed > 0) msg.append("\n\n").append(getString(R.string.sync_failed, failed)).append('\n').append(LocalStore.failedSummary(this));
        AlertDialog.Builder b = new AlertDialog.Builder(this)
                .setTitle(R.string.sync_title)
                .setMessage(msg.toString())
                .setPositiveButton(R.string.sync_now, (d, w) -> syncSoon())
                .setNegativeButton(R.string.ok, null);
        if (failed > 0) {
            b.setNeutralButton(R.string.sync_failed_actions, (d, w) -> failedActionsDialog());
        }
        b.show();
    }

    private void failedActionsDialog() {
        String[] items = { getString(R.string.sync_retry_failed), getString(R.string.sync_drop_failed) };
        new AlertDialog.Builder(this)
                .setTitle(R.string.sync_failed_actions)
                .setItems(items, (d, which) -> {
                    if (which == 0) {
                        LocalStore.retryFailed(this);
                        syncSoon();
                    } else {
                        new AlertDialog.Builder(this)
                                .setMessage(R.string.sync_drop_confirm)
                                .setPositiveButton(R.string.yes, (d2, w2) -> {
                                    LocalStore.dropFailed(this);
                                    LocalStore.Session l = LocalStore.session(this);
                                    if (l != null && !LocalStore.hasPendingFor(this, l.sessionId) && l.ended) LocalStore.setSession(this, null);
                                    render();
                                })
                                .setNegativeButton(R.string.no, null)
                                .show();
                    }
                })
                .show();
    }

    /** Kirim antrean sekarang juga (tidak menunggu putaran PollService berikutnya). */
    private void syncSoon() {
        new Thread(() -> {
            SyncEngine.syncQueue(getApplicationContext());
            SyncEngine.refreshCatalogIfDue(getApplicationContext(), false);
        }).start();
    }

    private String durationText(int minutes) {
        if (minutes <= 0) return getString(R.string.cashier_open_label);
        if (minutes % 60 == 0) return getString(R.string.hours_fmt, minutes / 60);
        if (minutes > 60) return getString(R.string.hours_minutes_fmt, minutes / 60, minutes % 60);
        return getString(R.string.minutes_fmt, minutes);
    }

    private void message(String text) {
        new AlertDialog.Builder(this).setMessage(text).setPositiveButton(R.string.ok, null).show();
    }

    /** ---------------- Jembatan dari halaman /tv ---------------- */

    private final class Bridge {
        /** Dipanggil halaman /tv setiap kali token layar dipasang ("" saat dilepas). */
        @JavascriptInterface
        public void setToken(String token) {
            StateRepo.setToken(MainActivity.this, token);
            // Katalog harga/paket untuk layar baru diambil segera (dipakai panel kasir saat offline).
            new Thread(() -> SyncEngine.refreshCatalogIfDue(getApplicationContext(), true)).start();
        }

        @JavascriptInterface
        public String appVersion() {
            return Config.APP_VERSION;
        }

        /** Sidik TV (hash) untuk pairing — server menolak pairing ke outlet lain selama TV ini masih terdaftar. */
        @JavascriptInterface
        public String deviceId() {
            DeviceId.init(getApplicationContext());
            return DeviceId.get();
        }
    }
}
