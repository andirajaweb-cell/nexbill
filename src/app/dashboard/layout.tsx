import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { AuthProvider } from "@/lib/auth/client";
import { SubscriptionGate } from "@/components/dashboard/SubscriptionGate";
import { AnnouncementPopup } from "@/components/dashboard/AnnouncementPopup";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";
import { DashboardLangProvider } from "@/lib/i18n/dashboard-lang";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLangProvider>
        <AnnouncementPopup />
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-6 overflow-x-hidden">
              <EmailVerificationBanner />
              <SubscriptionGate>{children}</SubscriptionGate>
            </main>
            <footer className="px-6 py-3 text-center text-xs text-neutral-600 border-t border-neutral-900">
              &copy; {new Date().getFullYear()} &mdash; Dibuat oleh{" "}
              <a href="https://www.digitrajasa.web.id" target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2">
                Digitrajasa
              </a>
            </footer>
          </div>
        </div>
      </DashboardLangProvider>
    </AuthProvider>
  );
}
