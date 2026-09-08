import { describe, it, expect, afterEach } from "vitest";
import { hasPermission, canApproveForRole, setFullEffectiveMatrix, DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS, ROLE_LEVEL } from "./permissions";

/**
 * Task #63 — RBAC around accounting actions (post_manual_journal, close_period, reopen_period,
 * void_expense, approve_requests, etc.) is a real control, not just UI polish: it's what makes
 * "closed accounting period rejects new posting" and "segregation of duties" (Task #62's
 * close_period vs reopen_period split) actually mean something. These tests pin the specific
 * trust decisions made this session so a future permission-matrix edit can't silently loosen them.
 */
describe("hasPermission — default matrix", () => {
  it("owner and superuser can close AND reopen accounting periods", () => {
    expect(hasPermission("owner", "close_period")).toBe(true);
    expect(hasPermission("owner", "reopen_period")).toBe(true);
    expect(hasPermission("superuser", "close_period")).toBe(true);
    expect(hasPermission("superuser", "reopen_period")).toBe(true);
  });

  it("accountant can close a period (routine month-end work) but NOT reopen one (higher-trust, segregation of duties)", () => {
    expect(hasPermission("accountant", "close_period")).toBe(true);
    expect(hasPermission("accountant", "reopen_period")).toBe(false);
  });

  it("manager, supervisor, cashier, and kitchen have neither close_period nor reopen_period", () => {
    for (const role of ["manager", "supervisor", "cashier", "kitchen"] as const) {
      expect(hasPermission(role, "close_period")).toBe(false);
      expect(hasPermission(role, "reopen_period")).toBe(false);
    }
  });

  it("only owner/superuser/accountant can post a manual journal entry", () => {
    expect(hasPermission("owner", "post_manual_journal")).toBe(true);
    expect(hasPermission("superuser", "post_manual_journal")).toBe(true);
    expect(hasPermission("accountant", "post_manual_journal")).toBe(true);
    expect(hasPermission("manager", "post_manual_journal")).toBe(false);
    expect(hasPermission("cashier", "post_manual_journal")).toBe(false);
  });

  it("every role in DEFAULT_ROLE_PERMISSIONS only references permissions that actually exist in ALL_PERMISSIONS", () => {
    // Catches the classic typo/rename bug: a permission string added to a role's array that
    // doesn't match any entry in the Permission union / PERMISSION_GROUPS would silently grant
    // nothing (hasPermission would just never match it) instead of failing loudly anywhere else.
    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as (keyof typeof DEFAULT_ROLE_PERMISSIONS)[]) {
      for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
  });
});

describe("hasPermission — DB-backed override via setFullEffectiveMatrix", () => {
  afterEach(() => {
    // Reset the module's mutable in-memory matrix back to hardcoded defaults so later test files
    // (or later tests in this file) never see an override leak across — mirrors what a real
    // process restart / cache refresh does.
    setFullEffectiveMatrix([]);
  });

  it("an explicit granted:true row adds a permission a role didn't have by default", () => {
    expect(hasPermission("cashier", "close_period")).toBe(false);
    setFullEffectiveMatrix([{ role: "cashier", permission: "close_period", granted: true }]);
    expect(hasPermission("cashier", "close_period")).toBe(true);
  });

  it("an explicit granted:false row revokes a permission a role has by default", () => {
    expect(hasPermission("owner", "reopen_period")).toBe(true);
    setFullEffectiveMatrix([{ role: "owner", permission: "reopen_period", granted: false }]);
    expect(hasPermission("owner", "reopen_period")).toBe(false);
  });

  it("an unknown role in a row is ignored rather than throwing", () => {
    expect(() => setFullEffectiveMatrix([{ role: "some_future_role", permission: "close_period", granted: true }])).not.toThrow();
  });
});

describe("canApproveForRole — approval hierarchy", () => {
  it("a strictly more senior role can approve a junior role's request", () => {
    expect(canApproveForRole("owner", "cashier")).toBe(true);
    expect(canApproveForRole("manager", "cashier")).toBe(true);
    expect(canApproveForRole("supervisor", "cashier")).toBe(true);
  });

  it("a role can never approve its own level or a more senior one", () => {
    expect(canApproveForRole("cashier", "cashier")).toBe(false);
    expect(canApproveForRole("supervisor", "manager")).toBe(false);
    expect(canApproveForRole("manager", "owner")).toBe(false);
  });

  it("kitchen and cashier share the most junior level and can't approve each other", () => {
    expect(ROLE_LEVEL.kitchen).toBe(ROLE_LEVEL.cashier);
    expect(canApproveForRole("kitchen", "cashier")).toBe(false);
    expect(canApproveForRole("cashier", "kitchen")).toBe(false);
  });
});
