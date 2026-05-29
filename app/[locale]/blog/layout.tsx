"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/common/app-header";
import { AppProviders } from "@/components/common/app-providers";
import { ClaimToastListener } from "@/components/common/claim-toast-listener";
import { CookieConsent } from "@/components/common/cookie-consent";
import { Footer } from "@/components/common/footer";
import { MobileSidebar, Sidebar } from "@/components/common/sidebar";
import { SidebarStateProvider } from "@/components/common/sidebar-state";
import { buildBlogSections } from "@/lib/sidebar-entries";

// Author workspace paths get the sidebar. Everything else on blog.kurl.me — the public feed at
// "/" and any other public page — gets the chrome-light header with no sidebar, so anyone can
// browse. stripLocale also drops the /blog (prod rewrite) or /blog-preview (dev) prefix.
const WORKSPACE_PATHS = [
  "/write",
  "/posts",
  "/drafts",
  "/series",
  "/readers",
  "/links",
  "/curation",
  "/leads",
];

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/[a-z]{2}(\/.*)?$/);
  let p = m?.[1] ?? pathname;
  for (const prefix of ["/blog-preview", "/blog"]) {
    if (p === prefix) return "/";
    if (p.startsWith(prefix + "/")) {
      p = p.slice(prefix.length);
      break;
    }
  }
  return p;
}

function matchesAny(path: string, list: string[]): boolean {
  return list.some((p) => path === p || path.startsWith(p + "/"));
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tBlog = useTranslations("sidebar.blog");
  const tCommon = useTranslations("sidebar.common");
  const { isAdmin } = useAuth();

  const internalPath = stripLocale(pathname);
  const isWorkspace = matchesAny(internalPath, WORKSPACE_PATHS);

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

  // Public surface (feed home + any other public blog page) — header, no workspace sidebar.
  return (
    <AppProviders>
      <SidebarStateProvider>
        <div className="flex min-h-screen flex-col">
          <AppHeader showMenu={false} />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </SidebarStateProvider>
      <CookieConsent />
      <ClaimToastListener />
    </AppProviders>
  );
}
