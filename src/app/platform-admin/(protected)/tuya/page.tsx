import { redirect } from "next/navigation";

/**
 * Retired 2026-09-15 — the legacy shared Tuya Cloud API account this page managed is no longer
 * in use by any outlet (Xtream Playstation, the last outlet on it, was migrated to its own Tuya
 * Cloud API credentials via its own Settings page). Kept as a redirect stub, not deleted outright,
 * since this file tool set has no delete capability and an old bookmark/direct URL hit should land
 * somewhere sane rather than 404. See lib/devices/adapters/tuya.ts's getCreds() — every outlet now
 * resolves its own Tuya credentials from outlets.tuyaAccessId/tuyaAccessSecret, no shared-account
 * fallback path exists anymore.
 */
export default function PlatformTuyaLegacyPage() {
  redirect("/platform-admin/outlets");
}
