/**
 * Toggles the "Spinning Symbols" loading cursor (see components/PsCursorSystem.tsx, mounted
 * once in the root layout, and the .ps-cursor-loading-active rules in globals.css). Call
 * setPsCursorLoading(true) right before a slow async action and setPsCursorLoading(false) in a
 * finally block — same on/off shape as any other loading flag, just expressed as the mouse
 * cursor instead of (or alongside) a button label. Safe to import anywhere; no-ops outside the
 * browser (e.g. if ever called during server rendering).
 */
export function setPsCursorLoading(loading: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("ps-cursor-loading-active", loading);
}
