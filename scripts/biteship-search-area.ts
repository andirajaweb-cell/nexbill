import "dotenv/config";
import { searchAreas } from "../src/lib/shipping/biteship";

/**
 * Standalone area-id lookup — split out from biteship-setup-origin.ts so fixing a wrong
 * BITESHIP_ORIGIN_AREA_ID doesn't require re-running the whole origin registration (which would
 * also create a duplicate entry in Biteship's Address Page every time it's run, since
 * POST /v1/locations is a create, not an upsert).
 *
 * Usage:
 *   npx tsx scripts/biteship-search-area.ts "Majalaya"
 */
async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (query.length < 3) {
    console.error('Usage: npx tsx scripts/biteship-search-area.ts "nama kecamatan/kota" (minimal 3 karakter)');
    process.exit(1);
  }

  const areas = await searchAreas(query);
  if (areas.length === 0) {
    console.log(`Tidak ada hasil untuk "${query}". Coba kata kunci lain (mis. tanpa "Kecamatan"/"Kabupaten", atau coba nama kota saja).`);
    process.exit(0);
  }

  console.log(`Ditemukan ${areas.length} kemungkinan area untuk "${query}":\n`);
  areas.forEach((a, i) => {
    console.log(`${i + 1}. ${a.name}${a.postalCode ? ` (kode pos ${a.postalCode})` : ""}`);
    console.log(`   id: ${a.id}`);
  });
  console.log("\nPilih yang paling cocok dengan lokasi gudang/kantor kamu, lalu di .env isi:");
  console.log("BITESHIP_ORIGIN_AREA_ID=<id yang dipilih, mulai dari IDNP...>");
  console.log("Setelah itu restart server dev (npm run dev).");
}

main().catch((err) => {
  console.error("Gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
