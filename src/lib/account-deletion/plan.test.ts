import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { outlets } from "@/db/schema";
import { ANONYMIZE_PLAN, OUTLET_PII_COLS } from "./plan";

describe("ANONYMIZE_PLAN", () => {
  it("only references columns that exist in the schema", () => {
    for (const step of ANONYMIZE_PLAN) {
      const cols = getTableColumns(step.table) as Record<string, unknown>;
      expect(cols[step.outletKey], `${step.label}.${step.outletKey}`).toBeDefined();
      for (const c of [...step.cols, ...(step.fileCols ?? [])]) expect(cols[c], `${step.label}.${c}`).toBeDefined();
      for (const f of step.fileCols ?? []) expect(step.cols).toContain(f);
    }
  });
  it("outlet PII columns exist and are all nullable (they are set to NULL)", () => {
    const cols = getTableColumns(outlets) as Record<string, { notNull: boolean }>;
    for (const c of OUTLET_PII_COLS) {
      expect(cols[c], c).toBeDefined();
      expect(cols[c].notNull, c).toBe(false);
    }
  });
});
