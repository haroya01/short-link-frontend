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
import { buildBlogSections } from "@/lib/sidebar-entries";

// middleware rewrite 후 internal path 기준. blog 의 workspace = 모든 logged-in path.
const WORKSPACE_PATHS = [
  "/blog",
  "/blog/write",
  "/blog/posts",
  "/blog/drafts",
  "/blog/series",
  "/blog/readers",
  "/blog/links",
  "/blog/curation",
  "/blog/leads",
];

const ANONYMOUS_MARKETING_PATHS = ["/blog/showcase"];

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/[a-z]{2}(\/.*)?$/);
  return m?.[1] ?? pathname;
}

function matchesAny(path: string, list: string[]): boolean {
  return list.some((p) => path === p || path.startsWith(p + "/"));
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authenticated } = useAuth();
  const tBlog = useTranslations("sidebar.blog");
  const tCommon = useTranslations("sidebar.common");
  const { isAdmin } = useAuth();

  const internalPath = stripLocale(pathname);
  const isMarketing = matchesAny(internalPath, ANONYMOUS_MARKETING_PATHS);
  const isWorkspace = !isMarketing && matchesAny(internalPath, WORKSPACE_PATHS);

  if (isMarketing) {
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

  if (isWorkspace) {
    const sections = buildBlogSections(tBlog, tCommon, { isAdmin });
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
