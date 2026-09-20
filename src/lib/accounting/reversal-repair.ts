import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Memasangkan jurnal pembalik dengan entri asli yang dibalikkannya, dan memutuskan mana yang
 * tanggalnya perlu dikembalikan. MURNI — tanpa database, supaya aturannya bisa diuji langsung.
 *
 * KENAPA MODUL INI ADA.
 *
 * Sampai 2026-09-20, voidJournal() tidak meneruskan entryDate ke postJournal, jadi setiap pembalik
 * ditulis bertanggal hari pembatalan — bukan tanggal entri yang dibalikkannya. Bug itu sudah
 * diperbaiki, tapi hanya berlaku ke depan. Pembalik yang terlanjur salah tanggal tetap duduk di
 * buku besar dan membawa revenue negatif ke hari yang salah: Control Center outlet XTREAM tanggal
 * 20/9/2026 melaporkan Laba Kotor Rp-249.935 dari pendapatan riil Rp26.000.
 *
 * KENAPA PEMASANGANNYA HARUS DITEBAK. voidJournal tidak pernah menyimpan foreign key ke entri yang
 * dibalikkannya — satu-satunya jejak adalah deskripsi berbentuk "[VOID] {deskripsi asli} —
 * {alasan}" plus sourceId yang sama dan entri asli berstatus "void". Karena itu modul ini hanya
 * mengakui pasangan bila TEPAT SATU kandidat cocok. Yang ambigu dikembalikan terpisah dan tidak
 * pernah diperbaiki otomatis: menebak pasangan jurnal berarti memindahkan angka ke tanggal yang
 * salah untuk kedua kalinya, dan kesalahan kedua jauh lebih sulit ditelusuri daripada yang pertama.
 */

export interface ReversalRepairEntry {
  entryId: string;
  entryDate: string;
  description: string;
  sourceId: string | null;
  status: string;
  /** Dampak entri ini terhadap akun bertipe revenue: sum(credit - debit). */
  revenue: number;
}

export interface RepairablePair {
  reversalEntryId: string;
  reversalDate: string;
  reversalDay: string;
  originalEntryId: string;
  originalDate: string;
  originalDay: string;
  revenueDampak: number;
  description: string;
}

export interface AmbiguousReversal {
  reversalEntryId: string;
  reversalDate: string;
  description: string;
  jumlahKandidat: number;
}

export interface PairingResult {
  repairable: RepairablePair[];
  ambiguous: AmbiguousReversal[];
  alreadyCorrect: number;
  totalReversals: number;
}

/** Konvensi yang dipakai voidJournal sejak awal — satu-satunya penanda jurnal pembalik. */
export function isReversal(description: string): boolean {
  return description.startsWith("[VOID]");
}

export function pairReversals(entries: ReversalRepairEntry[]): PairingResult {
  const reversals = entries.filter((e) => isReversal(e.description));
  const voided = entries.filter((e) => e.status === "void");

  // Dikelompokkan per sourceId supaya pencarian pasangan tidak jadi O(n²) pada outlet dengan
  // puluhan ribu entri jurnal.
  const voidedBySource = new Map<string, ReversalRepairEntry[]>();
  for (const v of voided) {
    const key = v.sourceId ?? "__none__";
    const list = voidedBySource.get(key) ?? [];
    list.push(v);
    voidedBySource.set(key, list);
  }

  const repairable: RepairablePair[] = [];
  const ambiguous: AmbiguousReversal[] = [];
  let alreadyCorrect = 0;

  for (const rev of reversals) {
    const kandidat = (voidedBySource.get(rev.sourceId ?? "__none__") ?? []).filter(
      (o) => o.entryId !== rev.entryId && rev.description.includes(o.description)
    );

    if (kandidat.length !== 1) {
      ambiguous.push({
        reversalEntryId: rev.entryId,
        reversalDate: rev.entryDate,
        description: rev.description,
        jumlahKandidat: kandidat.length,
      });
      continue;
    }

    const asli = kandidat[0];

    // Dibandingkan per hari kalender WIB, bukan string mentah. Pembalik yang ditulis beberapa detik
    // setelah aslinya pada hari yang sama sudah benar secara laporan — memindahkannya ke timestamp
    // yang identik tidak mengubah apa pun dan hanya menambah risiko tanpa manfaat.
    if (outletDateYmd(new Date(rev.entryDate)) === outletDateYmd(new Date(asli.entryDate))) {
      alreadyCorrect++;
      continue;
    }

    repairable.push({
      reversalEntryId: rev.entryId,
      reversalDate: rev.entryDate,
      reversalDay: outletDateYmd(new Date(rev.entryDate)),
      originalEntryId: asli.entryId,
      originalDate: asli.entryDate,
      originalDay: outletDateYmd(new Date(asli.entryDate)),
      revenueDampak: rev.revenue,
      description: rev.description,
    });
  }

  return { repairable, ambiguous, alreadyCorrect, totalReversals: reversals.length };
}

/** Berapa nilai revenue yang salah jatuh ke tiap hari — angka inilah yang membuat Laba Rugi hari itu minus, dan yang akan hilang begitu tanggalnya dikembalikan. */
export function impactByDay(repairable: RepairablePair[]): { hari: string; jumlahEntri: number; revenueSalahJatuhKeHariIni: number }[] {
  const map = new Map<string, { jumlahEntri: number; revenue: number }>();
  for (const p of repairable) {
    const cur = map.get(p.reversalDay) ?? { jumlahEntri: 0, revenue: 0 };
    cur.jumlahEntri++;
    cur.revenue += p.revenueDampak;
    map.set(p.reversalDay, cur);
  }
  return Array.from(map.entries())
    .map(([hari, v]) => ({ hari, jumlahEntri: v.jumlahEntri, revenueSalahJatuhKeHariIni: Math.round(v.revenue) }))
    .sort((a, b) => a.hari.localeCompare(b.hari));
}
