"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/common/app-header";
import { AppProviders } from "@/components/common/app-providers";
import { ClaimToastListener } from "@/components/common/claim-toast-listener";
import { CookieConsent } from "@/components/common/cookie-consent";
import { Footer } from "@/components/common/footer";
import { Nav } from "@/components/common/nav";
import { MobileSidebar, Sidebar } from "@/components/common/sidebar";
import { SidebarStateProvider } from "@/components/common/sidebar-state";
import { buildLinksSections } from "@/lib/sidebar-entries";

// middleware rewrite 후 internal path 기준.
const WORKSPACE_PATHS = [
  "/links/dashboard",
  "/links/campaigns",
  "/links/qr",
  "/links/ctas",
  "/links/stats",
  "/links/settings",
  "/links/admin",
  "/links/profile",
];

const MINIMAL_CHROME_PATHS = ["/links/login", "/links/auth"];

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/[a-z]{2}(\/.*)?$/);
  return m?.[1] ?? pathname;
}

function matchesAny(path: string, list: string[]): boolean {
  return list.some((p) => path === p || path.startsWith(p + "/"));
}

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tLinks = useTranslations("sidebar.links");
  const tCommon = useTranslations("sidebar.common");
  const { isAdmin } = useAuth();

  const internalPath = stripLocale(pathname);
  const isWorkspace = matchesAny(internalPath, WORKSPACE_PATHS);
  const isMinimal = matchesAny(internalPath, MINIMAL_CHROME_PATHS);

  if (isMinimal) {
    return (
      <AppProviders>
        <main className="flex-1">{children}</main>
      </AppProviders>
    );
  }

  if (isWorkspace) {
    const sections = buildLinksSections(tLinks, tCommon, { isAdmin });
    return (
      <AppProviders>
        <SidebarStateProvider>
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <div className="flex flex-1">
              <Sidebar sections={sections} />
              <MobileSidebar sections={sections} />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
            <Footer />
          </div>
        </SidebarStateProvider>
        <CookieConsent />
        <ClaimToastListener />
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
      <ClaimToastListener />
    </AppProviders>
  );
}
