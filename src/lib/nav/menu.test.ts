import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS, type Permission, type StaffRole } from "@/lib/auth/permissions";
import { NAV_ITEMS, visibleNav } from "./menu";

const ctx = (role: StaffRole, extra: Partial<Parameters<typeof visibleNav>[0]> = {}) => ({
  role,
  can: (p: Permission) => (DEFAULT_ROLE_PERMISSIONS[role] ?? []).includes(p),
  homeRentalEnabled: true,
  ppobEnabled: true,
  multiOutlet: false,
  ...extra,
});
const hrefs = (r: ReturnType<typeof visibleNav>) => r.flatMap((g) => g.items.map((i) => i.href));

describe("visibleNav", () => {
  it("owner sees every menu (except platform admin), grouped", () => {
    const r = visibleNav(ctx("owner"));
    const h = hrefs(r);
    expect(h).toContain("/dashboard/accounting");
    expect(h).toContain("/dashboard/settings");
    expect(h).toContain("/dashboard/ai");
    expect(h).not.toContain("/dashboard/admin");
    expect(r.map((g) => g.group.id)).toEqual(["operations", "customers", "finance", "devices", "growth", "admin"]);
  });

  it("cashier only sees front-desk menus", () => {
    const h = hrefs(visibleNav(ctx("cashier")));
    for (const p of ["/dashboard/rental", "/dashboard/pos", "/dashboard/booking", "/dashboard/shift", "/dashboard/help"]) expect(h).toContain(p);
    for (const p of ["/dashboard/accounting", "/dashboard/assets", "/dashboard/settings", "/dashboard/staff", "/dashboard/marketplace", "/dashboard/ai", "/dashboard/billing"]) expect(h).not.toContain(p);
    expect(h.length).toBeLessThan(NAV_ITEMS.length / 2 + 2);
  });

  it("kitchen sees only the kitchen screen, chat and help", () => {
    expect(hrefs(visibleNav(ctx("kitchen")))).toEqual(["/dashboard/kitchen", "/dashboard/chat", "/dashboard/help"]);
  });

  it("accountant sees finance, not front-desk management", () => {
    const h = hrefs(visibleNav(ctx("accountant")));
    expect(h).toContain("/dashboard/accounting");
    expect(h).toContain("/dashboard/expenses");
    expect(h).not.toContain("/dashboard/booking");
    expect(h).not.toContain("/dashboard/settings");
  });

  it("module switches and multi-outlet entry", () => {
    expect(hrefs(visibleNav(ctx("owner", { homeRentalEnabled: false, ppobEnabled: false })))).not.toContain("/dashboard/ppob");
    expect(hrefs(visibleNav(ctx("owner", { multiOutlet: true })))).toContain("/dashboard/semua-outlet");
    expect(hrefs(visibleNav(ctx("cashier", { multiOutlet: true })))).not.toContain("/dashboard/semua-outlet");
    expect(hrefs(visibleNav(ctx("superuser")))).toContain("/dashboard/admin");
  });
});
