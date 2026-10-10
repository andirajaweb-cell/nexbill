package id.nexbill.tv;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Menyalakan NEXBILL TV setelah TV dinyalakan ulang. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        PollService.start(context);
        Intent i = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(i);
        } catch (RuntimeException ignored) {
            // Android 10+ bisa menolak tanpa izin tampil di atas aplikasi lain / tanpa jadi aplikasi utama.
        }
    }
}
