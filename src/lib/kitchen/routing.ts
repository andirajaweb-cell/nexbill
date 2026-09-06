/**
 * Decides whether an order line for a product should start life in the Kitchen Display queue
 * ("new" — someone in the kitchen still has to act on it) or skip straight to "served" — e.g. a
 * packaged/pre-made drink or snack that the cashier just hands over, nothing to prepare.
 *
 * This is deliberately a pure, dependency-free module (no `@/db` import) so it can be shared
 * between server code (lib/pos/bill.ts, app/api/orders/route.ts) and the Inventory Produk tab's
 * client component, which needs the exact same resolution order to preview what a product will
 * currently do before the outlet has explicitly touched its toggle.
 *
 * Resolution order:
 *   1. products.sendToKitchen, if it's been explicitly set (not null) — always wins. This is the
 *      "Kirim ke Kitchen Display" checkbox on the Produk tab; an outlet uses this to turn kitchen
 *      routing OFF for a packaged item that happens to sit in a food/drink-ish category, or ON
 *      for something in a custom category that does need prep.
 *   2. Otherwise (never explicitly set — true for every product that existed before this feature,
 *      and for a freshly created one until the owner touches the checkbox): having an active
 *      Recipe/BOM is strong evidence the product is actually made, not just resold as-is.
 *   3. Otherwise, fall back to the original hardcoded category guess (food/drink/coffee/snack/
 *      dessert) so nothing changes for existing data until someone reviews it.
 */
export const LEGACY_FNB_CATEGORY_CODES = new Set(["food", "drink", "coffee", "snack", "dessert"]);

export interface KitchenRoutingProduct {
  sendToKitchen: boolean | null;
  category: string;
}

export function resolveSendToKitchen(product: KitchenRoutingProduct | undefined | null, hasRecipe: boolean): boolean {
  if (!product) return false;
  if (product.sendToKitchen !== null && product.sendToKitchen !== undefined) return product.sendToKitchen;
  if (hasRecipe) return true;
  return LEGACY_FNB_CATEGORY_CODES.has(product.category);
}

export function resolveKitchenStatus(product: KitchenRoutingProduct | undefined | null, hasRecipe: boolean): "new" | "served" {
  return resolveSendToKitchen(product, hasRecipe) ? "new" : "served";
}
