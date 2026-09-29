import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { platformLeads } from "../src/db/schema";
import { toWhatsappNumber } from "../src/lib/leads/places";
import { LEAD_PRIORITIES, LEAD_TEMPERATURES, type LeadPriority, type LeadTemperature } from "../src/lib/leads/constants";

/**
 * Imports the beachhead prospect list (rental PS di Majalaya, Ciparay, Rancaekek, Cicalengka, plus a
 * few gelombang-2 outlets) into /platform-admin/leads. Data was collected from public Google Maps
 * listings on 2026-09-29; unknown fields stay NULL (= belum diketahui) and pain points are marked
 * as hypotheses until confirmed with the merchant.
 *
 * Usage (after migration 0024):
 *   npm run seed:leads-majalaya            # insert
 *   npm run seed:leads-majalaya -- --dry   # show what would be inserted, write nothing
 *
 * Safe to re-run: a prospect whose name already exists in the CRM (case-insensitive) is skipped,
 * so edits made in the dashboard are never overwritten.
 */

interface SeedLead {
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  area: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  priority: string | null;
  temperature: string | null;
  painPoints: string | null;
  acquisitionAngle: string | null;
  nextAction: string | null;
  notes: string | null;
}

const SEARCH_QUERY = "Riset Google Maps 29 Sep 2026 — rental PS Majalaya s/d Cicalengka";

const asPriority = (v: string | null): LeadPriority | null => ((LEAD_PRIORITIES as readonly string[]).includes(v ?? "") ? (v as LeadPriority) : null);
const asTemperature = (v: string | null): LeadTemperature | null => ((LEAD_TEMPERATURES as readonly string[]).includes(v ?? "") ? (v as LeadTemperature) : null);

async function main() {
  const dry = process.argv.includes("--dry");
  const file = path.resolve(process.cwd(), "scripts/data/leads-majalaya-2026-09.json");
  const seeds: SeedLead[] = JSON.parse(readFileSync(file, "utf-8"));

  const existing = await db.select({ name: sql<string>`lower(${platformLeads.name})` }).from(platformLeads);
  const taken = new Set(existing.map((e) => e.name));

  const rows = seeds
    .filter((s) => s.name?.trim() && !taken.has(s.name.trim().toLowerCase()))
    .map((s) => ({
      source: "google_maps" as const,
      searchQuery: SEARCH_QUERY,
      name: s.name.trim(),
      category: s.category,
      address: s.address,
      city: s.city,
      area: s.area,
      phone: s.phone,
      waNumber: toWhatsappNumber(s.phone),
      mapsUrl: s.mapsUrl,
      lat: s.lat,
      lng: s.lng,
      rating: s.rating,
      reviewCount: s.reviewCount,
      priority: asPriority(s.priority),
      temperature: asTemperature(s.temperature),
      painPoints: s.painPoints,
      acquisitionAngle: s.acquisitionAngle,
      nextAction: s.nextAction,
      notes: s.notes,
    }));

  console.log(`${seeds.length} prospek di file, ${seeds.length - rows.length} sudah ada di CRM, ${rows.length} akan ditambahkan.`);
  if (dry) {
    for (const r of rows) console.log(`  [${r.priority ?? "-"}] ${r.name} — ${r.area ?? r.city ?? "-"}`);
    process.exit(0);
  }
  if (rows.length) await db.insert(platformLeads).values(rows);
  console.log(`Selesai. Buka /platform-admin/leads → urutkan "Prioritas" atau "Jarak".`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
