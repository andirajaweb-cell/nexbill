package id.nexbill.tv;

import android.content.Context;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

/** Timer kecil di atas layar HDMI untuk mode "Pindah input TV" (butuh izin tampil di atas aplikasi lain). */
final class OverlayTimer {
    private final Context ctx;
    private WindowManager wm;
    private TextView view;

    OverlayTimer(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    static boolean permitted(Context c) {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c);
    }

    void show(String text, boolean warn) {
        if (!permitted(ctx)) return;
        if (view == null) {
            wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
            view = new TextView(ctx);
            view.setTextSize(22);
            view.setTypeface(Typeface.DEFAULT_BOLD);
            view.setTextColor(0xFFFFFFFF);
            view.setPadding(28, 12, 28, 12);
            int type = Build.VERSION.SDK_INT >= 26
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    type,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                    PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.TOP | Gravity.END;
            lp.x = 40;
            lp.y = 32;
            try {
                wm.addView(view, lp);
            } catch (RuntimeException e) {
                view = null;
                return;
            }
        }
        view.setText(text);
        view.setBackground(pill(warn ? 0xE6B91C1C : 0xB3000000));
    }

    void hide() {
        if (view != null && wm != null) {
            try {
                wm.removeView(view);
            } catch (RuntimeException ignored) {
            }
        }
        view = null;
    }

    static GradientDrawable pill(int color) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(48f);
        return d;
    }
}
