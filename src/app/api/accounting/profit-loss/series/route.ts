import { NextRequest, NextResponse } from "next/server";
import { computeProfitLoss } from "@/lib/accounting/reports";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { buildPeriodBuckets, PL_GRANULARITIES, ymdRangeToIso, type PlGranularity } from "@/lib/accounting/period-series";

export const maxDuration = 60;

/**
 * GET ?granularity=day|week|month|quarter|year&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Laba Rugi multi-periode dalam format yang SAMA dengan Laba Rugi satu periode (computeProfitLoss
 * per kolom: Pendapatan usaha → HPP → Laba Kotor → Beban operasional → Laba Usaha → lain-lain →
 * Laba Sebelum Pajak → PPh → Laba Bersih), ditambah kolom Total untuk seluruh rentang. Kolom
 * memakai kalender outlet (WIB) dan menutup rentang tanpa celah, jadi jumlah kolom = Total.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const sp = req.nextUrl.searchParams;
    const granularity = sp.get("granularity") as PlGranularity;
    if (!PL_GRANULARITIES.includes(granularity)) return NextResponse.json({ error: "Jenis periode tidak dikenal." }, { status: 400 });
    let buckets;
    try {
      buckets = buildPeriodBuckets(granularity, sp.get("from") ?? "", sp.get("to") ?? "");
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
    }

    // Dihitung bertahap (4 sekaligus) supaya rentang 31 hari tidak membuka puluhan koneksi DB bersamaan.
    const columns: { key: string; fromYmd: string; toYmd: string; partial: boolean; pl: Awaited<ReturnType<typeof computeProfitLoss>> }[] = [];
    for (let i = 0; i < buckets.length; i += 4) {
      const chunk = buckets.slice(i, i + 4);
      const results = await Promise.all(
        chunk.map(async (b) => {
          const { from, to } = ymdRangeToIso(b.fromYmd, b.toYmd);
          return { ...b, pl: await computeProfitLoss(session.outletId, from, to) };
        })
      );
      columns.push(...results);
    }
    const whole = ymdRangeToIso(buckets[0].fromYmd, buckets[buckets.length - 1].toYmd);
    const total = await computeProfitLoss(session.outletId, whole.from, whole.to);
    return NextResponse.json({ granularity, from: buckets[0].fromYmd, to: buckets[buckets.length - 1].toYmd, columns, total });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
