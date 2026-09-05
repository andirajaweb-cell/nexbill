"use client";

/**
 * Shared volume preference for the dashboard's Web-Audio-generated notification beeps (Rental
 * PS's "time almost up" alarm, Kitchen Display's new-order/food-ready beeps — see playAlertBeep()
 * in rental/page.tsx and playTones() in kitchen/page.tsx). One shared localStorage key so setting
 * the volume on one page carries over to the other, since they're the same kind of "attention"
 * sound conceptually, just triggered by different events.
 *
 * Deliberately just a single 0-100 volume rather than a separate on/off + volume pair — dragging
 * the slider to 0 IS mute, same as a phone's physical volume rocker. Kitchen Display keeps its own
 * additional on/off toggle on top of this (persisted separately) since that one also gates the
 * browser Notification API call, not just the beep.
 */

const VOLUME_KEY = "nexbill_notif_sound_volume";
const DEFAULT_VOLUME = 70;

export function getNotificationVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    const n = raw !== null ? Number(raw) : NaN;
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

/** Returns the clamped value actually stored, so callers can sync their own state to it. */
export function setNotificationVolume(volume: number): number {
  const clamped = Math.min(100, Math.max(0, Math.round(volume)));
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(VOLUME_KEY, String(clamped));
  } catch {
    // localStorage unavailable (private mode, etc.) — volume just won't persist across reloads.
  }
  return clamped;
}

/** Scales a beep's original hardcoded peak gain (written when there was no volume control at
 * all — e.g. 0.3/0.35 in the existing oscillator code) by the current 0-100 volume preference, so
 * 100% matches the original loudness instead of introducing a totally different scale. Reads
 * localStorage fresh on every call (beeps fire rarely — a handful of times a minute at most) so a
 * volume change on one page takes effect on the other without needing a shared live subscription. */
export function scaledGain(peakAtMax: number): number {
  return (getNotificationVolume() / 100) * peakAtMax;
}
