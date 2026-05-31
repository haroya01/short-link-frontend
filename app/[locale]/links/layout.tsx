"use client";

import { usePathname } from "next/navigation";
import { AppProviders } from "@/components/common/app-providers";
import { ClaimToastListener } from "@/components/common/claim-toast-listener";
import { CookieConsent } from "@/components/common/cookie-consent";
import { Footer } from "@/components/common/footer";
import { LinksBottomNav } from "@/components/common/links-bottom-nav";
import { Nav } from "@/components/common/nav";

// Login / OAuth callback get a chrome-less shell. Everything else (marketing + the logged-in
// product) shares the single top Nav — the workspace sidebar IA was dropped in favour of a flat
// top bar, and the blog lives separately on its own subdomain.
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
  const internalPath = stripLocale(pathname);

  if (matchesAny(internalPath, MINIMAL_CHROME_PATHS)) {
    return (
      <AppProviders>
        <main className="flex-1">{children}</main>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <Nav />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <Footer />
      <CookieConsent />
      <ClaimToastListener />
      {/* Mobile-only bottom tab bar — matches the blog; carries profile + kurl↔blog switch. */}
      <LinksBottomNav />
    </AppProviders>
  );
}
