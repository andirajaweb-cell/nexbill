import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  hasPermission,
  hasPermissionInOutlet,
  setFullEffectiveMatrix,
  outletRoleKey,
  parseOutletRoleKey,
  OUTLET_EDITABLE_ROLES,
} from "./permissions";
import { beginPermissionScope, runWithOutletPermissions } from "./permission-scope";

/*
 * Checklist izin karyawan khusus outlet (Owner). Yang dijaga:
 *   1. pengecualian satu outlet tidak pernah berlaku di outlet lain;
 *   2. Owner/Superuser & izin terkunci tidak bisa diubah lewat checklist outlet;
 *   3. outlet aktif mengikuti request (AsyncLocalStorage) — dua request bersamaan dari outlet
 *      berbeda tidak saling melihat checklist masing-masing;
 *   4. helper yang memanggil getSession() melakukannya sebelum await lain (syarat permission-scope).
 */

const A = "outlet-A";
const B = "outlet-B";

afterEach(() => setFullEffectiveMatrix([]));

describe("izin khusus outlet — data", () => {
  it("outlet A memberi Kasir izin refund; outlet B dan bawaan tidak berubah", () => {
    setFullEffectiveMatrix([{ role: outletRoleKey(A, "cashier"), permission: "refund_order", granted: true }]);
    expect(hasPermissionInOutlet(A, "cashier", "refund_order")).toBe(true);
    expect(hasPermissionInOutlet(B, "cashier", "refund_order")).toBe(false);
    expect(hasPermissionInOutlet(null, "cashier", "refund_order")).toBe(false);
    expect(hasPermission("cashier", "refund_order")).toBe(false); // tanpa outlet aktif
  });

  it("outlet A mencabut izin bawaan Supervisor; outlet B tetap punya", () => {
    setFullEffectiveMatrix([{ role: outletRoleKey(A, "supervisor"), permission: "manage_pricing_promo", granted: false }]);
    expect(hasPermissionInOutlet(A, "supervisor", "manage_pricing_promo")).toBe(false);
    expect(hasPermissionInOutlet(B, "supervisor", "manage_pricing_promo")).toBe(true);
  });

  it("baris outlet untuk Owner/Superuser atau izin terkunci diabaikan", () => {
    setFullEffectiveMatrix([
      { role: `outlet:${A}:owner`, permission: "manage_staff", granted: false },
      { role: `outlet:${A}:superuser`, permission: "manage_staff", granted: false },
      { role: outletRoleKey(A, "manager"), permission: "manage_feature_flags", granted: true },
    ]);
    expect(hasPermissionInOutlet(A, "owner", "manage_staff")).toBe(true);
    expect(hasPermissionInOutlet(A, "superuser", "manage_staff")).toBe(true);
    expect(hasPermissionInOutlet(A, "manager", "manage_feature_flags")).toBe(false);
  });

  it("kunci outlet bisa dibaca balik dan tidak pernah sama dengan role biasa", () => {
    for (const role of OUTLET_EDITABLE_ROLES) {
      const key = outletRoleKey("abc-123", role);
      expect(parseOutletRoleKey(key)).toEqual({ outletId: "abc-123", role });
      expect(["superuser", "owner", "manager", "cashier", "accountant", "kitchen", "supervisor"]).not.toContain(key);
    }
    expect(parseOutletRoleKey("cashier")).toBeNull();
    expect(parseOutletRoleKey("outlet:abc:owner")).toBeNull();
  });

  it("baris outlet tidak mengubah matriks bawaan role yang sama", () => {
    setFullEffectiveMatrix([{ role: outletRoleKey(A, "kitchen"), permission: "view_reports", granted: true }]);
    expect(hasPermissionInOutlet(B, "kitchen", "view_reports")).toBe(false);
    expect(hasPermissionInOutlet(null, "kitchen", "view_reports")).toBe(false);
  });
});

describe("izin khusus outlet — outlet aktif per request", () => {
  // Meniru getSession(): beginPermissionScope() SINKRON di awal, outlet diisi setelah await.
  async function fakeGetSession(outletId: string, delayMs: number) {
    const scope = beginPermissionScope();
    await new Promise((r) => setTimeout(r, delayMs));
    scope.outletId = outletId;
    return { outletId };
  }
  async function fakeRoute(outletId: string, delayMs: number) {
    await fakeGetSession(outletId, delayMs);
    await new Promise((r) => setTimeout(r, 5));
    return hasPermission("cashier", "refund_order");
  }

  it("dua request bersamaan dari outlet berbeda masing-masing hanya melihat checklist outletnya", async () => {
    setFullEffectiveMatrix([{ role: outletRoleKey(A, "cashier"), permission: "refund_order", granted: true }]);
    const [a, b, a2] = await Promise.all([fakeRoute(A, 15), fakeRoute(B, 5), fakeRoute(A, 1)]);
    expect(a).toBe(true);
    expect(b).toBe(false);
    expect(a2).toBe(true);
  });

  it("runWithOutletPermissions untuk kerja latar per outlet", () => {
    setFullEffectiveMatrix([{ role: outletRoleKey(B, "cashier"), permission: "view_reports", granted: true }]);
    expect(runWithOutletPermissions(B, () => hasPermission("cashier", "view_reports"))).toBe(true);
    expect(runWithOutletPermissions(A, () => hasPermission("cashier", "view_reports"))).toBe(false);
  });
});

describe("getSession() dipanggil sebelum await lain di helper src/lib", () => {
  const root = join(__dirname, "..");
  const files: string[] = [];
  (function walk(d: string) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) files.push(p);
    }
  })(root);

  it("setiap fungsi async di src/lib yang memanggil getSession() tidak melakukan await lain sebelumnya", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("getSession()") || file.endsWith(join("auth", "session.ts"))) continue;
      const fnRe = /async\s+(?:function\s*\w*\s*)?\([^)]*\)[^{=]*(?:=>\s*)?\{/g;
      let m: RegExpExecArray | null;
      while ((m = fnRe.exec(src))) {
        let i = m.index + m[0].length;
        let depth = 1;
        const start = i;
        while (i < src.length && depth > 0) {
          if (src[i] === "{") depth++;
          else if (src[i] === "}") depth--;
          i++;
        }
        const body = src.slice(start, i);
        const call = body.indexOf("getSession()");
        if (call < 0) continue;
        const before = body.slice(0, call).replace(/await\s*$/, "");
        if (/\bawait\b/.test(before)) offenders.push(`${file}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
