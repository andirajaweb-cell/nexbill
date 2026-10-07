/**
 * Pure positioning logic for SearchableSelect's portaled dropdown panel (kept out of the component
 * so it can be unit-tested without a DOM).
 *
 * Why this exists — Android bug "pilihan langsung tertutup sendiri" (PPOB "Diambil dari" /
 * "Masuk ke", and every other SearchableSelect): the panel used to CLOSE on any window scroll or
 * resize. On a phone, opening the panel auto-focused its search box → the soft keyboard slid up →
 * the browser scrolled the focused input into view and/or resized the viewport → that scroll/resize
 * closed the panel within a few hundred ms, before the user could tap an option. Now the panel is
 * REPOSITIONED on scroll/resize and only closed when its trigger button has left the visible area.
 */

export interface TriggerRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface Viewport {
  /** Layout viewport height (window.innerHeight) — what position:fixed coordinates are relative to. */
  layoutHeight: number;
  /** Visible height (visualViewport.height; smaller than layoutHeight while the soft keyboard is open). */
  visibleHeight: number;
  /** Layout viewport width (window.innerWidth). */
  width: number;
}

export interface PanelPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  /** Max height for the scrollable option list so it never runs under the keyboard / off-screen. */
  listMaxHeight: number;
}

const GAP = 4;
const EDGE = 8;
/** Search box row + borders above the list. */
const SEARCH_ROW = 52;
const MIN_PANEL_WIDTH = 220;
const DEFAULT_LIST_MAX = 224; // = Tailwind max-h-56
const MIN_LIST = 96;

export function computePanelPosition(rect: TriggerRect, vp: Viewport): PanelPosition {
  const visible = Math.min(vp.visibleHeight || vp.layoutHeight, vp.layoutHeight);
  const spaceBelow = visible - rect.bottom - GAP - EDGE;
  const spaceAbove = rect.top - GAP - EDGE;
  const wanted = SEARCH_ROW + DEFAULT_LIST_MAX;
  const placeAbove = spaceBelow < wanted && spaceAbove > spaceBelow;
  const room = placeAbove ? spaceAbove : spaceBelow;
  const listMaxHeight = Math.max(MIN_LIST, Math.min(DEFAULT_LIST_MAX, Math.floor(room - SEARCH_ROW)));

  const width = Math.min(Math.max(rect.width, MIN_PANEL_WIDTH), Math.max(vp.width - EDGE * 2, 0));
  // Keep the panel fully on-screen horizontally (a 220px-min panel under a narrow trigger near the
  // right edge used to overflow the phone screen).
  const left = Math.max(EDGE, Math.min(rect.left, vp.width - width - EDGE));

  return placeAbove
    ? { left, width, bottom: vp.layoutHeight - rect.top + GAP, listMaxHeight }
    : { left, width, top: rect.bottom + GAP, listMaxHeight };
}

/** True when the trigger button is no longer visible at all — the only case the panel should auto-close. */
export function isTriggerOffscreen(rect: TriggerRect, vp: Viewport): boolean {
  const visible = Math.min(vp.visibleHeight || vp.layoutHeight, vp.layoutHeight);
  return rect.bottom <= 0 || rect.top >= visible;
}
