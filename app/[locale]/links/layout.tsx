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

// Public-path based. The /links URL prefix was abolished — middleware rewrites /foo → /links/foo
// internally, but usePathname (next/navigation) reports the public /foo. stripLocale also drops a
// stray /links so matching holds whether usePathname yields the public or rewritten internal path.
const WORKSPACE_PATHS = [
  "/dashboard",
  "/campaigns",
  "/qr",
  "/ctas",
  "/stats",
  "/settings",
  "/admin",
  "/profile",
];

const MINIMAL_CHROME_PATHS = ["/login", "/auth"];

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/[a-z]{2}(\/.*)?$/);
  let p = m?.[1] ?? pathname;
  if (p === "/links") return "/";
  if (p.startsWith("/links/")) p = p.slice("/links".length);
  return p;
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
