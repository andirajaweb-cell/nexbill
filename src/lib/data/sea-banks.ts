/**
 * Reference list of major Southeast Asian banks + their SWIFT/BIC codes, for the outlet bank
 * account picker in Settings > Business & Tax (used to receive referral commission payouts —
 * see lib/referral/service.ts) and shown to NEXBILL ops in /platform-admin/referrals when
 * recording a payout.
 *
 * Sourced from public SWIFT-code directories (theswiftcodes.com, bank.codes, Wise) at the time
 * this list was compiled — NOT a live feed from SWIFT's own registry. Banks occasionally add,
 * retire, or change codes for specific branches/services. Treat this as a convenience starting
 * point, not a guaranteed-current source of truth: the SWIFT code field in the UI is always
 * left editable so an outlet can correct it, and an outlet whose bank isn't listed at all can
 * pick "Bank lainnya" and type in the bank name + SWIFT code manually. Always double-check the
 * SWIFT code with the receiving bank before relying on it for an actual international transfer.
 *
 * Codes below are the 8-character head-office format (no branch suffix); many banks also accept
 * the equivalent 11-character form with a trailing "XXX".
 */
export interface SeaBank {
  name: string;
  swift: string;
}

export interface SeaCountry {
  code: string; // ISO 3166-1 alpha-2
  label: string;
  banks: SeaBank[];
}

export const SEA_BANKS: SeaCountry[] = [
  {
    code: "ID",
    label: "Indonesia",
    banks: [
      { name: "Bank Central Asia (BCA)", swift: "CENAIDJA" },
      { name: "Bank Rakyat Indonesia (BRI)", swift: "BRINIDJA" },
      { name: "Bank Mandiri", swift: "BMRIIDJA" },
      { name: "Bank Negara Indonesia (BNI)", swift: "BNINIDJA" },
      { name: "CIMB Niaga", swift: "BNIAIDJA" },
      { name: "Bank Danamon", swift: "BDINIDJA" },
      { name: "Permata Bank", swift: "BBBAIDJA" },
    ],
  },
  {
    code: "MY",
    label: "Malaysia",
    banks: [
      { name: "Maybank", swift: "MBBEMYKL" },
      { name: "CIMB Bank Berhad", swift: "CIBBMYKL" },
      { name: "Public Bank Berhad", swift: "PBBEMYKL" },
      { name: "RHB Bank Berhad", swift: "RHBBMYKL" },
      { name: "Hong Leong Bank Berhad", swift: "HLBBMYKL" },
    ],
  },
  {
    code: "SG",
    label: "Singapura",
    banks: [
      { name: "DBS Bank", swift: "DBSSSGSG" },
      { name: "OCBC Bank", swift: "OCBCSGSG" },
      { name: "UOB (United Overseas Bank)", swift: "UOVBSGSG" },
      { name: "Standard Chartered Bank (Singapore)", swift: "SCBLSG22" },
    ],
  },
  {
    code: "TH",
    label: "Thailand",
    banks: [
      { name: "Bangkok Bank", swift: "BKKBTHBK" },
      { name: "Kasikornbank", swift: "KASITHBK" },
      { name: "Krungthai Bank", swift: "KRTHTHBK" },
      { name: "Siam Commercial Bank (SCB)", swift: "SICOTHBK" },
      { name: "Bank of Ayudhya (Krungsri)", swift: "AYUDTHBK" },
    ],
  },
  {
    code: "PH",
    label: "Filipina",
    banks: [
      { name: "BDO Unibank", swift: "BNORPHMM" },
      { name: "Bank of the Philippine Islands (BPI)", swift: "BOPIPHMM" },
      { name: "Metrobank", swift: "MBTCPHMM" },
      { name: "Landbank", swift: "TLBPPHMM" },
      { name: "Security Bank", swift: "SETCPHMM" },
      { name: "UnionBank of the Philippines", swift: "UBPHPHMM" },
    ],
  },
  {
    code: "VN",
    label: "Vietnam",
    banks: [
      { name: "Vietcombank", swift: "BFTVVNVX" },
      { name: "BIDV", swift: "BIDVVNVX" },
      { name: "Techcombank", swift: "VTCBVNVX" },
      { name: "VietinBank", swift: "ICBVVNVX" },
    ],
  },
  {
    code: "BN",
    label: "Brunei Darussalam",
    banks: [
      { name: "Baiduri Bank", swift: "BAIDBNBB" },
      { name: "Bank Islam Brunei Darussalam (BIBD)", swift: "BIBDBNBB" },
    ],
  },
  {
    code: "KH",
    label: "Kamboja",
    banks: [
      { name: "ACLEDA Bank", swift: "ACLBKHPP" },
      { name: "ABA Bank", swift: "ABAAKHPP" },
      { name: "Canadia Bank", swift: "CADIKHPP" },
    ],
  },
  {
    code: "LA",
    label: "Laos",
    banks: [{ name: "BCEL (Banque pour le Commerce Exterieur Lao)", swift: "COEBLALA" }],
  },
  {
    code: "MM",
    label: "Myanmar",
    banks: [
      { name: "KBZ Bank (Kanbawza Bank)", swift: "KBZBMMMY" },
      { name: "AYA Bank", swift: "AYABMMMY" },
    ],
  },
];

export function findSeaBank(countryCode: string, bankName: string): SeaBank | undefined {
  return SEA_BANKS.find((c) => c.code === countryCode)?.banks.find((b) => b.name === bankName);
}

/**
 * Country -> dashboard LangCode, used to auto-derive outlets.preferredLang the moment an outlet
 * saves its outletCountry in Settings (see /api/settings/outlet) — see the doc comment on
 * preferredLang in schema.ts for why country, not a direct language picker, is now the
 * user-facing field. Only 6 dashboard languages exist (lib/i18n/registry.ts) for 10 SEA
 * countries, so Brunei/Cambodia/Laos/Myanmar fall back to "en" (no dedicated dashboard
 * translation exists for Malay-Brunei/Khmer/Lao/Burmese yet) — Brunei's official language is
 * also Malay, but it shares Malaysia's "ms" dict closely enough that "en" is kept as the safer
 * neutral default until someone actually requests a Brunei-specific dashboard language. Same
 * fallback logic applies to resolveBillingCurrencyForOutlet: those 4 countries' currencies
 * aren't in marketRiskCurrencies either (only USD/MYR/THB/VND/PHP are seeded), so they'll show
 * USD via the "en" mapping in LANG_TO_CURRENCY_CODE until a platform admin adds their currency.
 */
export const SEA_COUNTRY_TO_LANG: Record<string, string> = {
  ID: "id",
  MY: "ms",
  SG: "en",
  TH: "th",
  PH: "fil",
  VN: "vi",
  BN: "en",
  KH: "en",
  LA: "en",
  MM: "en",
};
