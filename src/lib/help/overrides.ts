import { db } from "@/db/client";
import { helpContentOverrides } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { HELP_CATEGORIES, type HelpCategory } from "./content";

/**
 * Fields a Superuser is allowed to edit on a Help Center category — deliberately excludes `id`
 * and `group`, which are structural (sidebar grouping/lookup keys) and stay fixed to whatever
 * content.ts defines, so an edit can never silently move a category to a different group or break
 * the id-based lookup the page/API use everywhere.
 */
export type EditableHelpFields = Partial<Pick<HelpCategory, "label" | "navHint" | "summary" | "roles" | "steps" | "notes" | "subsections">>;

/** Raw {categoryId: editedFields} map for one outlet — what the GET route returns to the client. */
export async function getHelpOverridesForOutlet(outletId: string): Promise<Record<string, EditableHelpFields>> {
  const rows = await db.select().from(helpContentOverrides).where(eq(helpContentOverrides.outletId, outletId));
  const map: Record<string, EditableHelpFields> = {};
  for (const row of rows) {
    try {
      map[row.categoryId] = JSON.parse(row.contentJson);
    } catch {
      // Corrupt/unparseable row — skip it rather than crash the whole Help page over one bad edit.
    }
  }
  return map;
}

/** Applies an outlet's overrides on top of the shipped defaults — same merge the client does, kept here too for any server-rendered/exported use. */
export function mergeHelpCategories(overrides: Record<string, EditableHelpFields>): HelpCategory[] {
  return HELP_CATEGORIES.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c));
}

export async function upsertHelpOverride(outletId: string, categoryId: string, fields: EditableHelpFields, updatedByUserId: string) {
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(helpContentOverrides)
    .where(and(eq(helpContentOverrides.outletId, outletId), eq(helpContentOverrides.categoryId, categoryId)))
    .limit(1);

  if (existing) {
    await db
      .update(helpContentOverrides)
      .set({ contentJson: JSON.stringify(fields), updatedBy: updatedByUserId, updatedAt: now })
      .where(eq(helpContentOverrides.id, existing.id));
  } else {
    await db.insert(helpContentOverrides).values({
      outletId,
      categoryId,
      contentJson: JSON.stringify(fields),
      updatedBy: updatedByUserId,
    });
  }
}

export async function resetHelpOverride(outletId: string, categoryId: string) {
  await db
    .delete(helpContentOverrides)
    .where(and(eq(helpContentOverrides.outletId, outletId), eq(helpContentOverrides.categoryId, categoryId)));
}
