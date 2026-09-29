import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/auth/platform-session";
import { PlatformAdminShell } from "@/components/platform-admin/PlatformAdminShell";

// Daftar menu (dikelompokkan + ikon) sekarang ada di components/platform-admin/PlatformAdminShell.tsx.

/**
 * Server-guarded shell for the entire /platform-admin/** tree (except /platform-admin/login,
 * which lives outside this segment on purpose so the redirect below can't loop). Deliberately
 * its own layout — no <Sidebar>/<TopBar> from the outlet dashboard, no shared nav — so there is
 * zero code path connecting an outlet's staff session to this cross-tenant control panel. An
 * outlet superuser hitting /platform-admin directly just gets redirected to this panel's own
 * login, which their staff credentials can never pass (see /api/platform-admin/auth/login).
 */
export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getPlatformSession();
  if (!session) redirect("/platform-admin/login");

  return <PlatformAdminShell name={session.name}>{children}</PlatformAdminShell>;
}
