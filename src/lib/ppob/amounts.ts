/**
 * Hitungan uang PPOB untuk form kasir — satu sumber supaya form, ringkasan, dan modal edit
 * menampilkan angka yang sama dengan yang dibukukan engine.ts:
 *   uang keluar (ke provider)  = modal + biaya admin provider        (= "principal", hutang ke provider)
 *   uang masuk  (dari customer) = uang keluar + margin               (= "uangMasuk")
 *   untung                      = margin                              (satu-satunya pendapatan)
 * Modal kosong = sama dengan nominal (perilaku lama form).
 */
export interface PpobAmountInput {
  nominal: number;
  modal?: number | null;
  providerFee?: number | null;
  margin?: number | null;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function ppobAmounts(input: PpobAmountInput) {
  const modal = input.modal === null || input.modal === undefined || (input.modal as unknown) === "" ? n(input.nominal) : n(input.modal);
  const providerFee = n(input.providerFee);
  const margin = n(input.margin);
  const uangKeluar = modal + providerFee;
  const uangMasuk = uangKeluar + margin;
  return { modal, providerFee, margin, uangKeluar, uangMasuk };
}

/** Kasir mengisi "harga ke customer" → margin dihitung otomatis. */
export function marginFromPrice(price: number, modal: number, providerFee: number) {
  return n(price) - n(modal) - n(providerFee);
}
