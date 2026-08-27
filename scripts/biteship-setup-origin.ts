import "dotenv/config";
import { createLocation, searchAreas } from "../src/lib/shipping/biteship";

/**
 * One-time setup: registers NEXBILL's shipping origin (warehouse/office where Smart Plug stock
 * ships from) in Biteship's own dashboard (Address Page), and separately looks up the matching
 * "area id" you need to paste into BITESHIP_ORIGIN_AREA_ID in .env — these are two DIFFERENT
 * Biteship identifiers (see the doc comment on createLocation() in lib/shipping/biteship.ts), so
 * this script does both in one run rather than making you juggle two API calls by hand.
 *
 * Does NOT touch .env for you — prints candidate area ids and lets you confirm + paste the right
 * one yourself, since picking the wrong district silently would produce wrong shipping quotes for
 * every Smart Plug order.
 *
 * Usage:
 *   npx tsx scripts/biteship-setup-origin.ts \
 *     "Nama Gudang/Kantor NEXBILL" \
 *     "Nama PIC" \
 *     "08123456789" \
 *     "Jl. Alamat Lengkap No. 1, RT/RW, Kelurahan, Kecamatan, Kota" \
 *     12440 \
 *     -6.234567 \
 *     106.812345 \
 *     "Kecamatan Cilandak"
 *
 * The last two numeric args are latitude/longitude — get them from Google Maps: right-click the
 * exact pin location > click the coordinates shown at the top of the context menu to copy them.
 * The last text arg is the kecamatan/kota name to search for the matching area id.
 */
async function main() {
  const [, , name, contactName, contactPhone, address, postalCodeStr, latStr, lngStr, areaSearch] = process.argv;

  if (!name || !contactName || !contactPhone || !address || !postalCodeStr || !latStr || !lngStr || !areaSearch) {
    console.error(
      [
        "Usage:",
        '  npx tsx scripts/biteship-setup-origin.ts "Nama Gudang" "Nama PIC" "08123456789" "Alamat lengkap" 12440 -6.234567 106.812345 "Kecamatan Cilandak"',
        "",
        "Semua 8 argumen wajib diisi (lihat komentar di atas file ini untuk detail & cara ambil latitude/longitude dari Google Maps).",
      ].join("\n")
    );
    process.exit(1);
  }

  const postalCode = Number(postalCodeStr);
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!Number.isFinite(postalCode) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.error("Kode pos, latitude, dan longitude harus berupa angka.");
    process.exit(1);
  }

  console.log("1/2 — Menyimpan lokasi asal ke Biteship (Address Page)...");
  const location = await createLocation({
    name,
    contactName,
    contactPhone,
    address,
    postalCode,
    latitude,
    longitude,
    type: "origin",
  });
  console.log(`   Berhasil. Biteship location_id: ${location.id}`);
  console.log("   (location_id ini untuk pemesanan order lewat Biteship nanti — BUKAN nilai untuk BITESHIP_ORIGIN_AREA_ID, lihat langkah 2 di bawah.)\n");

  console.log(`2/2 — Mencari area_id untuk "${areaSearch}" (dipakai di Rates API / BITESHIP_ORIGIN_AREA_ID)...`);
  const areas = await searchAreas(areaSearch);
  if (areas.length === 0) {
    console.log("   Tidak ada hasil. Coba jalankan ulang dengan kata kunci kecamatan/kota yang berbeda (mis. tanpa \"Kecamatan\"/\"Kabupaten\").");
    process.exit(0);
  }

  console.log(`   Ditemukan ${areas.length} kemungkinan area — pilih yang paling cocok dengan lokasi gudang kamu, lalu salin ID-nya ke BITESHIP_ORIGIN_AREA_ID di .env:\n`);
  areas.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.name}${a.postalCode ? ` (kode pos ${a.postalCode})` : ""}`);
    console.log(`      id: ${a.id}`);
  });
  console.log("\nSetelah memilih, buka .env, isi BITESHIP_ORIGIN_AREA_ID=<id yang dipilih>, lalu restart server.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
