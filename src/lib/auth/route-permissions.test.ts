import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Penjaga regresi audit izin 2026-10-11. Route di bawah ini mengubah harga, diskon, stok, atau kas,
 * dan dulu hanya dijaga menu yang disembunyikan. Setiap handler yang terdaftar wajib memeriksa
 * izin peran di server (forbidUnless / hasPermission / hasAnyPermission). Kalau handler baru
 * sengaja terbuka untuk semua staf, jangan dimasukkan ke daftar ini.
 */
const GUARDED: [route: string, method: string][] = [
  ["products", "POST"],
  ["products/[id]", "PATCH"],
  ["vouchers", "POST"],
  ["membership-tiers", "POST"],
  ["inventory", "POST"],
  ["supplier-purchases", "POST"],
  ["purchase-orders", "POST"],
  ["purchase-orders/[id]/receive", "POST"],
  ["purchase-orders/auto-fill", "POST"],
  ["purchase-returns", "POST"],
  ["purchase-invoices/[id]/pay", "POST"],
  ["stock-opnames", "POST"],
  ["stock-opnames/[id]/complete", "POST"],
  ["rental-units", "POST"],
  ["rental-units/[id]", "PATCH"],
  ["devices/relay-agent-token-request", "POST"],
];

const GUARD = /forbidUnless\(|hasPermission\(|hasAnyPermission\(/;

function handlerBody(source: string, method: string): string {
  const start = source.search(new RegExp(`export async function ${method}\\b`));
  if (start < 0) return "";
  const rest = source.slice(start + 1);
  const next = rest.search(/\nexport async function /);
  return next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
}

describe("API route permission guards", () => {
  it.each(GUARDED)("%s %s checks the caller's role permission", (route, method) => {
    const source = readFileSync(join(__dirname, "..", "..", "app", "api", route, "route.ts"), "utf8");
    const body = handlerBody(source, method);
    expect(body, `${method} handler not found in ${route}`).not.toBe("");
    expect(GUARD.test(body), `${method} /api/${route} has no role permission check`).toBe(true);
  });

  it("stock adjustments never take the staff id from the request body", () => {
    const source = readFileSync(join(__dirname, "..", "..", "app", "api", "inventory", "route.ts"), "utf8");
    const body = handlerBody(source, "POST");
    expect(body).toContain("const staffUserId = session.sub");
    expect(body).not.toMatch(/\{[^}]*staffUserId[^}]*\}\s*=\s*await req\.json\(\)/);
  });
});
