import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { AuthProvider } from "@/lib/auth/client";
import { SubscriptionGate } from "@/components/dashboard/SubscriptionGate";
import { AnnouncementPopup } from "@/components/dashboard/AnnouncementPopup";
import { GracePaymentReminderPopup } from "@/components/dashboard/GracePaymentReminderPopup";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { DashboardLangProvider } from "@/lib/i18n/dashboard-lang";
import { DashboardThemeProvider, ANTI_FLASH_SCRIPT } from "@/lib/ui/dashboard-theme";
import "./dashboard-theme.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLangProvider>
        <DashboardThemeProvider>
          {/* Blocking, runs before hydration — reads the user's saved dashboard theme straight
              from localStorage and adds "theme-light" to <html> immediately, so a returning
              light-mode user never sees a flash of the default dark look first. See
              ANTI_FLASH_SCRIPT's own comment in dashboard-theme.tsx for why <html> and not a
              local wrapper div. */}
          <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
          <AnnouncementPopup />
          <GracePaymentReminderPopup />
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 p-6 overflow-x-hidden">
                <EmailVerificationBanner />
                <SubscriptionGate>{children}</SubscriptionGate>
              </main>
              <DashboardFooter />
            </div>
          </div>
        </DashboardThemeProvider>
      </DashboardLangProvider>
    </AuthProvider>
  );
}
