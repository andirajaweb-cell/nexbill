"use client";

/**
 * Drop-in replacement for the browser's native `alert()`/`confirm()` — those render as an
 * OS-chrome popup ("localhost:3000 says...") that ignores the app's dark GameMaster theme and
 * looks broken/unpolished. This module is the imperative API half of that replacement: call
 * `showAlert(message)` or `await showConfirm(message)` exactly like the native versions, and a
 * themed modal (rendered by <DialogHost/>, mounted once in the root layout) appears instead.
 *
 * Implementation is a tiny single-subscriber pub/sub: DialogHost registers itself as the one
 * listener on mount, and every call here just hands it the next dialog to render + a resolver
 * to settle the returned Promise once the user picks an action. No React context/provider
 * wiring needed at call sites — pages just import the two functions and use them exactly where
 * `alert(...)` / `confirm(...)` used to be.
 */

export interface DialogOptions {
  title?: string;
  /** "danger" swaps the icon/accent to rose and the primary button to the danger style — use for destructive confirms (delete, void, etc.). */
  tone?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
}

export type DialogState =
  | { kind: "alert"; message: string; options?: DialogOptions; resolve: (value: void) => void }
  | { kind: "confirm"; message: string; options?: DialogOptions; resolve: (value: boolean) => void };

type Listener = (state: DialogState | null) => void;

let listener: Listener | null = null;

/** Called by <DialogHost/> on mount/unmount — internal, not for use outside that component. */
export function __registerDialogListener(l: Listener | null) {
  listener = l;
}

/** Themed stand-in for `alert(message)`. Resolves once the user dismisses the dialog; most call sites don't need to await it since it's typically the last statement before a `return`. */
export function showAlert(message: string, options?: DialogOptions): Promise<void> {
  return new Promise((resolve) => {
    if (!listener) {
      // DialogHost hasn't mounted yet (shouldn't happen once wired into layout.tsx) — fail safe to the native dialog rather than silently swallowing the message.
      window.alert(message);
      resolve();
      return;
    }
    listener({ kind: "alert", message, options, resolve });
  });
}

/** Themed stand-in for `confirm(message)` — MUST be awaited (`if (!(await showConfirm(...))) return;`) since, unlike native `confirm()`, this can't block synchronously. */
export function showConfirm(message: string, options?: DialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      resolve(window.confirm(message));
      return;
    }
    listener({ kind: "confirm", message, options, resolve });
  });
}
