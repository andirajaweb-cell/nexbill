# AI Business Intelligence (Asisten Bisnis & Insight)

Halaman dashboard: **AI** (`/dashboard/ai`). Pemakai: Owner & Superuser saja.

## Siapa yang mendapat AI

| Status langganan | AI | Kuota |
|---|---|---|
| Masa percobaan 30 hari | Ya | `trial` |
| Paket Pro | Ya (termasuk paket) | `paid` |
| Paket Starter + AI Add-on aktif | Ya | `paid` |
| Paket Starter tanpa Add-on | Terkunci | — |
| **Akses Gratis Selamanya** | **Ya, sejak 2026-11-02, tanpa membeli Add-on** | `free_forever` |
| Superuser (akun internal) | Ya | `internal` |

Aturan di `planIncludesAi` / `assertAiAllowed` (`src/lib/subscription/service.ts`).

## Kuota per outlet (COGS)

Biaya token Claude dibatasi per outlet (`src/lib/ai/quota-rules.ts`, diuji di `quota-rules.test.ts`):

| Tier | Pertanyaan/hari | Pertanyaan/bulan | Rekomendasi/hari | Rekomendasi/bulan | Anggaran token/bulan* |
|---|---|---|---|---|---|
| paid | 40 | 600 | 5 | 60 | 3.000.000 |
| free_forever | 20 | 300 | 2 | 30 | 1.500.000 |
| trial | 20 | 200 | 3 | 20 | 1.500.000 |
| internal | 500 | 10.000 | 100 | 2.000 | 100.000.000 |

\* Token tertimbang (setara input): input + cache_write×1,25 + cache_read×0,1 + output×5. Dengan Claude Haiku (US$1 input / US$5 output per juta token), 3 juta ≈ US$3 per outlet per bulan pada pemakaian maksimum.

- Dihitung per tanggal lokal outlet; reset harian & awal bulan otomatis.
- Permintaan dihitung **sebelum** memanggil AI (klik beruntun tetap terhitung); token dicatat setelah respons.
- Bot Instagram (`agent.ts`) memakai anggaran token yang sama; bila habis bot diam dan staf membalas dari dashboard.
- Disimpan di tabel `activity_sync_state` (migrasi 0039), key `ai-usage:<outletId>` — **tanpa migrasi baru**. Bila 0039 belum dijalankan, hitungan sementara disimpan di memori proses.
- Ubah batas tanpa ubah kode: env `AI_QUOTA` (JSON parsial), contoh `{"paid":{"assistantPerDay":60},"free_forever":{"tokenBudgetPerMonth":2000000}}`.
- Meter kuota tampil di atas halaman AI (`GET /api/ai/usage`). Kuota habis → HTTP 429 `code: "ai_quota"`.

Penghemat token lain: riwayat chat dipotong di server (10 giliran, 1.500 karakter/pesan, pertanyaan maks 1.000 karakter), maks 4 putaran tool + jawaban maks 900 token, hasil tool diringkas (array maks 25 baris, maks 8.000 karakter), prompt caching untuk definisi tool + system, rekomendasi di-cache 6 jam per outlet (`ai-reco:<outletId>`).

## Model

Ditentukan platform, bukan outlet (`src/lib/ai/models.ts`): bawaan `claude-haiku-5-5`; override env `AI_ASSISTANT_MODEL`, `AI_INSIGHTS_MODEL`, `AI_CHATBOT_MODEL`, `AI_TRANSLATE_MODEL`. Bila model tidak dikenali API (404), otomatis dicoba ulang dengan `claude-haiku-5-5`. Kolom `agent_settings.model` tidak dipakai lagi oleh AI dashboard.

## Data yang dibaca Asisten (tool baca-saja, `src/lib/ai/business-tools.ts`)

| Tool | Fitur NEXBILL | Paket |
|---|---|---|
| `get_today_snapshot` | Unit PS, sesi berjalan, pendapatan hari ini, shift terbuka, booking hari ini, NEXBILL TV, stok menipis | semua |
| `get_sales_report`, `get_rental_report`, `get_inventory_report`, `get_customer_report` | Laporan operasional | semua |
| `get_bookings` | Booking & no-show | semua |
| `get_shift_review`, `get_cashier_performance` | Shift, selisih kas, tanda anti-fraud (Pro) | semua (tanda: Pro) |
| `get_nexbill_tv_status` | Layar TV online/offline, aksi gagal sinkron, sesi uji staf | semua |
| `get_promos` | Promo aktif | semua |
| `get_business_calendar` | Cuaca BMKG, libur nasional, kalender akademik, bola, baseline | Pro |
| `get_expense_report`, `get_expense_dashboard` | Pengeluaran | semua |
| `get_profit_loss` | Laba Rugi ringkas | semua |
| `get_financial_health`, `get_balance_sheet`, `get_cash_flow` | Pembukuan Lengkap | Pro |
| `get_fixed_assets_summary` | Aset | Pro |
| `get_ppob_summary` | PPOB | Pro |
| `get_home_rental_summary` | Rental ke Rumah | semua |

Tool fitur yang tidak dimiliki outlet menjawab `{locked: true}` — AI menjelaskan bahwa itu fitur Pro.

**Rekomendasi AI** (tab Insight) memakai tren/forecast/anomali + konteks lintas fitur (Kalender Bisnis 7 hari, booking 7 hari, unit terlaris/tersepi, F&B terlaris & waste, shift 30 hari, NEXBILL TV, stok menipis) dalam **satu** panggilan AI.

## Bug yang diperbaiki (2026-11-02)

1. Sapaan UI terkirim sebagai pesan pertama (role assistant) → API menolak → setiap pertanyaan "Maaf, ada error".
2. Model `claude-sonnet-5` (dari `agent_settings.model`) — mahal dan bisa tidak dikenali.
3. Tanggal dari AI dioper mentah ke laporan → hari terakhir periode hilang ("penjualan hari ini" = 0). Sekarang `normalizeReportRange`.
4. AI Starter + Add-on bisa membaca Neraca/Arus Kas/Aset (fitur Pro) lewat AI. Sekarang mengikuti paket.
5. Insight: pendapatan per tanggal UTC vs biaya per tanggal WIB; hari ini yang belum selesai ikut dihitung; label tren "naik/turun" tidak diterjemahkan dan sensitif berlebihan; Sabtu ramai terbaca anomali; tab Insight "Memuat..." selamanya bila error.
6. Error AI (terkunci, error API) selalu 500 dengan pesan mentah; sekarang 403/429/502 dengan pesan 6 bahasa.
7. Bot Instagram membaca unit/menu/promo **semua outlet** dan membuat pre-order di outlet pertama. Sekarang satu outlet (`IG_AGENT_OUTLET_ID`, cadangan outlet pertama) dan mengikuti hak AI + anggaran token outlet itu.
8. Jawaban dalam bahasa dashboard (6 bahasa), bukan selalu Indonesia.
