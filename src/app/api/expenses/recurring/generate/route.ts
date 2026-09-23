import { NextRequest, NextResponse } from "next/server";
import { generateDueRecurringExpenses } from "@/lib/accounting/expense";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Dipicu manual lewat tombol di UI — aplikasi ini tidak punya penjadwal background job. Membuat
 * draft expense untuk setiap template aktif yang sudah jatuh tempo, termasuk MENYUSUL periode yang
 * terlewat (satu template bisa menghasilkan beberapa draft sekaligus — lihat
 * generateDueRecurringExpenses untuk bug yang dulu membuatnya hanya membuat satu).
 *
 * Hasilnya berstatus "draft" dan belum memposting jurnal apa pun, jadi belum muncul di Laba Rugi
 * sampai di-Submit dan disetujui. Itu disengaja: nominal biaya rutin seperti gaji dan listrik bisa
 * berbeda tiap periode dan harus dilihat manusia dulu.
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin generate recurring expense." }, { status: 403 });
    }
    const { generated, templatesMasihTertinggal } = await generateDueRecurringExpenses(session.outletId);
    return NextResponse.json({
      generatedCount: generated.length,
      generatedIds: generated,
      templatesMasihTertinggal,
      catatan:
        generated.length === 0
          ? "Tidak ada template yang jatuh tempo. Kalau ada yang Anda harapkan muncul, cek tanggal 'Jatuh tempo berikutnya' pada template tersebut."
          : "Draft sudah dibuat, tapi BELUM masuk Laba Rugi. Buka tab Daftar Expense, lalu Submit dan setujui tiap draft supaya jurnalnya terposting.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
