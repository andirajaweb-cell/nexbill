import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Penjaga isolasi antar-outlet untuk route baru (Okt 2026): Jeda semua saat mati lampu, TV yang
 * ditemukan NexbillAgent, link booking, dan daftar Siap Buka Outlet. Setiap route ini WAJIB:
 *   - mengambil outlet dari sesi login (session.outletId), tidak pernah dari body/query;
 *   - menyaring setiap query/UPDATE dengan outlet itu.
 * Pemeriksaan statis — gagal kalau seseorang kelak menghapus syarat outlet dari salah satu query.
 */
const api = (p: string) => readFileSync(join(__dirname, "..", "..", "app", "api", p, "route.ts"), "utf8");

const ROUTES = ["rental-sessions/pause-all", "devices/discovered-tvs", "outlets/booking-link", "onboarding/checklist", "outlet-role-permissions"];

describe.each(ROUTES)("tenant scope: /api/%s", (route) => {
  const src = api(route);
  it("derives the outlet from the login session", () => {
    expect(src).toMatch(/session\.outletId/);
  });
  it("never takes an outlet id from the request body or query string", () => {
    expect(src).not.toMatch(/body\.outletId|searchParams\.get\(["']outletId["']\)|body\["outletId"\]/);
  });
});

describe("Jeda semua (pause-all) hanya menyentuh outlet sendiri", () => {
  const src = api("rental-sessions/pause-all");
  it("every UPDATE on rental_sessions is filtered by the session outlet in its own WHERE", () => {
    const updates = src.split(".update(rentalSessions)").slice(1);
    expect(updates.length).toBe(2);
    for (const u of updates) {
      const where = u.slice(0, u.indexOf(".returning("));
      expect(where).toMatch(/eq\(rentalSessions\.outletId, outletId\)/);
    }
    expect(src).toMatch(/const outletId = session\.outletId;/);
  });
  it("resume only touches the sessions paused together (same pausedAt), not every paused session", () => {
    expect(src).toMatch(/eq\(rentalSessions\.pausedAt, pausedAt\)/);
  });
});

describe("TV yang ditemukan agent hanya dari agent outlet sendiri", () => {
  const src = api("devices/discovered-tvs");
  it("filters relay agents and devices by the session outlet", () => {
    expect(src).toMatch(/where\(eq\(relayAgents\.outletId, session\.outletId\)\)/);
    expect(src).toMatch(/where\(eq\(devices\.outletId, session\.outletId\)\)/);
  });
});

describe("Checklist izin karyawan hanya untuk outlet sendiri", () => {
  const src = api("outlet-role-permissions");
  it("every read/write is keyed by the session outlet", () => {
    expect(src).toMatch(/listOutletRolePermissions\(outletId\)/);
    expect(src).toMatch(/setOutletRolePermission\(outletId,/);
    expect(src).toMatch(/resetOutletRolePermissions\(outletId,/);
    expect((src.match(/const outletId = session\.outletId;/g) ?? []).length).toBe(3);
  });
  it("only Owner/Superuser may change it", () => {
    expect((src.match(/if \(!canEdit\(session\.role\)\)/g) ?? []).length).toBe(2);
  });
});
