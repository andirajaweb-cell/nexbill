import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { commitAssetImport, parseAssetWorkbook } from "@/lib/assets/asset-xlsx";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FUNDINGS = ["opening_balance", "paid", "payable"] as const;

/**
 * Upload Daftar Aset dari Excel (multipart: file, funding, cashBankAccountId?, paymentMethod?,
 * supplierId?, dryRun). dryRun=1 hanya memeriksa file dan mengembalikan pratinjau (baris valid,
 * baris error, kelompok per tanggal, total) TANPA menyimpan apa pun. Tanpa dryRun, file diperiksa
 * ulang dan baru disimpan kalau tidak ada error — lihat lib/assets/asset-xlsx.ts.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola aset." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "File Excel wajib diupload." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Ukuran file maksimal 5 MB." }, { status: 400 });

    const parsed = await parseAssetWorkbook(session.outletId, Buffer.from(await file.arrayBuffer()));
    const preview = {
      totalRows: parsed.totalRows,
      validRows: parsed.items.length,
      errors: parsed.errors,
      units: parsed.units,
      total: parsed.total,
      groups: parsed.groups.map((g) => ({
        date: g.date,
        units: g.units,
        total: g.total,
        items: g.items.map((i) => ({ row: i.row, name: i.name, category: i.category, qty: i.qty, unitCost: i.unitCost, usefulLifeMonths: i.usefulLifeMonths, rentalUnitName: i.rentalUnitName })),
      })),
    };
    if (String(form.get("dryRun") ?? "") === "1") return NextResponse.json({ preview });

    const funding = String(form.get("funding") ?? "opening_balance");
    if (!(FUNDINGS as readonly string[]).includes(funding)) return NextResponse.json({ error: "Cara pencatatan tidak dikenal." }, { status: 400 });
    if (parsed.errors.length) return NextResponse.json({ error: "Masih ada baris yang salah — perbaiki file lalu upload ulang.", preview }, { status: 400 });

    try {
      const result = await commitAssetImport(parsed, {
        outletId: session.outletId,
        staffUserId: session.sub,
        funding: funding as (typeof FUNDINGS)[number],
        cashBankAccountId: String(form.get("cashBankAccountId") ?? "") || null,
        paymentMethod: String(form.get("paymentMethod") ?? "") || null,
        supplierId: String(form.get("supplierId") ?? "") || null,
      });
      return NextResponse.json({ preview, result });
    } catch (err: unknown) {
      const created = (err as { created?: unknown[] })?.created ?? [];
      return NextResponse.json({ error: describeError(err), partial: created }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
