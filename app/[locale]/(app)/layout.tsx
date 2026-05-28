import type { Metadata } from "next";

import { AppHeader } from "@/components/common/app-header";
import { AppProviders } from "@/components/common/app-providers";
import { ClaimToastListener } from "@/components/common/claim-toast-listener";
import { CookieConsent } from "@/components/common/cookie-consent";
import { Footer } from "@/components/common/footer";
import { SidebarStateProvider } from "@/components/common/sidebar-state";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <SidebarStateProvider>
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <div className="flex flex-1">{children}</div>
          <Footer />
        </div>
      </SidebarStateProvider>
      <CookieConsent />
      <ClaimToastListener />
    </AppProviders>
  );
}
