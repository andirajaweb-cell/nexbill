package id.nexbill.tv;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Layar PIN staf "di dalam aplikasi" (pilihan kedua selain pop-up): kotak besar di tengah layar dengan
 * 6 titik, papan angka 3×4 yang bisa dipilih tombol arah remote, serta tombol Batal. Tombol angka di
 * remote langsung mengisi PIN; Back = batal. Dipasang di atas semua lapisan MainActivity.
 */
final class PinPad {
    interface Listener {
        void onSubmit(String pin);

        void onCancel();
    }

    private final FrameLayout overlay;
    private final TextView[] dots = new TextView[6];
    private final TextView error;
    private final TextView subtitle;
    private final Button firstKey;
    private Listener listener;
    private final StringBuilder pin = new StringBuilder();
    private boolean busy;

    PinPad(Context ctx, FrameLayout root) {
        overlay = new FrameLayout(ctx);
        overlay.setBackgroundColor(0xE6020617);
        overlay.setVisibility(View.GONE);
        overlay.setClickable(true);

        LinearLayout card = new LinearLayout(ctx);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(ctx, 36), dp(ctx, 28), dp(ctx, 36), dp(ctx, 24));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF00B1220);
        bg.setCornerRadius(dp(ctx, 28));
        bg.setStroke(dp(ctx, 1), 0x3322D3EE);
        card.setBackground(bg);

        TextView brand = text(ctx, 13, 0xFF67E8F9, true);
        brand.setText("NEXBILL TV");
        brand.setLetterSpacing(0.35f);
        card.addView(brand);
        TextView title = text(ctx, 30, Color.WHITE, true);
        title.setText(R.string.pin_title);
        card.addView(title);
        subtitle = text(ctx, 16, 0xFF94A3B8, false);
        card.addView(subtitle);

        LinearLayout row = new LinearLayout(ctx);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(0, dp(ctx, 18), 0, dp(ctx, 6));
        for (int i = 0; i < dots.length; i++) {
            TextView d = text(ctx, 30, Color.WHITE, true);
            d.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(ctx, 52), dp(ctx, 64));
            lp.setMargins(dp(ctx, 5), 0, dp(ctx, 5), 0);
            row.addView(d, lp);
            dots[i] = d;
        }
        card.addView(row);
        error = text(ctx, 16, 0xFFFDA4AF, false);
        error.setMinHeight(dp(ctx, 26));
        card.addView(error);

        GridLayout grid = new GridLayout(ctx);
        grid.setColumnCount(3);
        String[] keys = { "1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK" };
        Button first = null;
        for (String k : keys) {
            Button b = key(ctx, k);
            b.setOnClickListener(v -> press(k));
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = dp(ctx, 92);
            lp.height = dp(ctx, 58);
            lp.setMargins(dp(ctx, 5), dp(ctx, 5), dp(ctx, 5), dp(ctx, 5));
            grid.addView(b, lp);
            if (first == null) first = b;
        }
        firstKey = first;
        card.addView(grid);

        Button cancel = key(ctx, ctx.getString(R.string.pin_cancel_back));
        cancel.setTextSize(16);
        cancel.setOnClickListener(v -> {
            if (listener != null) listener.onCancel();
        });
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 52));
        clp.topMargin = dp(ctx, 10);
        cancel.setPadding(dp(ctx, 24), 0, dp(ctx, 24), 0);
        card.addView(cancel, clp);

        overlay.addView(card, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        root.addView(overlay, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        render();
    }

    boolean isShowing() {
        return overlay.getVisibility() == View.VISIBLE;
    }

    void show(String sub, Listener l) {
        listener = l;
        pin.setLength(0);
        busy = false;
        error.setText("");
        subtitle.setText(sub == null ? "" : sub);
        subtitle.setVisibility(sub == null || sub.isEmpty() ? View.GONE : View.VISIBLE);
        render();
        overlay.setVisibility(View.VISIBLE);
        overlay.bringToFront();
        firstKey.requestFocus();
    }

    void hide() {
        overlay.setVisibility(View.GONE);
        listener = null;
        busy = false;
    }

    /** PIN ditolak: kosongkan dan tampilkan pesan, layar tetap terbuka. */
    void fail(String message) {
        busy = false;
        pin.setLength(0);
        error.setText(message);
        render();
    }

    void setBusy(boolean b) {
        busy = b;
    }

    /** Tombol remote saat layar PIN terbuka. true = sudah ditangani. */
    boolean handleKey(KeyEvent e) {
        int k = e.getKeyCode();
        if (k >= KeyEvent.KEYCODE_0 && k <= KeyEvent.KEYCODE_9) {
            if (e.getAction() == KeyEvent.ACTION_UP) press(String.valueOf(k - KeyEvent.KEYCODE_0));
            return true;
        }
        if (k >= KeyEvent.KEYCODE_NUMPAD_0 && k <= KeyEvent.KEYCODE_NUMPAD_9) {
            if (e.getAction() == KeyEvent.ACTION_UP) press(String.valueOf(k - KeyEvent.KEYCODE_NUMPAD_0));
            return true;
        }
        if (k == KeyEvent.KEYCODE_DEL) {
            if (e.getAction() == KeyEvent.ACTION_UP) press("⌫");
            return true;
        }
        if (k == KeyEvent.KEYCODE_BACK || k == KeyEvent.KEYCODE_ESCAPE) {
            if (e.getAction() == KeyEvent.ACTION_UP && listener != null) listener.onCancel();
            return true;
        }
        return false; // tombol arah & OK → navigasi/klik tombol di layar
    }

    private void press(String k) {
        if (busy) return;
        if ("⌫".equals(k)) {
            if (pin.length() > 0) pin.setLength(pin.length() - 1);
        } else if ("OK".equals(k)) {
            submit();
            return;
        } else if (pin.length() < 6) {
            pin.append(k);
            error.setText("");
        }
        render();
        if (pin.length() == 6) submit();
    }

    private void submit() {
        if (pin.length() < 4) {
            error.setText(R.string.pin_too_short);
            return;
        }
        busy = true;
        if (listener != null) listener.onSubmit(pin.toString());
    }

    private void render() {
        for (int i = 0; i < dots.length; i++) {
            dots[i].setText(i < pin.length() ? "•" : "");
            GradientDrawable d = new GradientDrawable();
            d.setCornerRadius(dp(dots[i].getContext(), 14));
            d.setColor(0x66000000);
            d.setStroke(dp(dots[i].getContext(), i == pin.length() ? 2 : 1), i == pin.length() ? 0xFF22D3EE : 0x33FFFFFF);
            dots[i].setBackground(d);
        }
    }

    private static TextView text(Context ctx, float sp, int color, boolean bold) {
        TextView t = new TextView(ctx);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private static Button key(Context ctx, String label) {
        Button b = new Button(ctx);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextSize(22);
        b.setTextColor(Color.WHITE);
        b.setFocusable(true);
        GradientDrawable normal = new GradientDrawable();
        normal.setCornerRadius(dp(ctx, 16));
        normal.setColor(0x14FFFFFF);
        normal.setStroke(dp(ctx, 1), 0x22FFFFFF);
        GradientDrawable focused = new GradientDrawable();
        focused.setCornerRadius(dp(ctx, 16));
        focused.setColor(0x4022D3EE);
        focused.setStroke(dp(ctx, 2), 0xFF22D3EE);
        StateListDrawable sl = new StateListDrawable();
        sl.addState(new int[] { android.R.attr.state_focused }, focused);
        sl.addState(new int[] { android.R.attr.state_pressed }, focused);
        sl.addState(new int[] {}, normal);
        b.setBackground(sl);
        return b;
    }

    private static int dp(Context ctx, int v) {
        return Math.round(v * ctx.getResources().getDisplayMetrics().density);
    }
}
