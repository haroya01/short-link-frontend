"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { AppHeader } from "@/components/common/app-header";
import { AppProviders } from "@/components/common/app-providers";
import { BlogBottomNav } from "@/components/common/blog-bottom-nav";
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

  const internalPath = stripLocale(pathname);
  const isWorkspace = matchesAny(internalPath, WORKSPACE_PATHS);

  if (isWorkspace) {
    return (
      <AppProviders>
        <SidebarStateProvider>
          <div className="flex min-h-screen flex-col">
            <AppHeader />
            <WorkspaceBody>{children}</WorkspaceBody>
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
        <div className="flex min-h-screen flex-col dark:bg-slate-950 dark:text-slate-300">
          {/* Feed home is the discovery hub → rest the header search open there; other public pages
              (post, tags, author) keep the compact 🔍. */}
          <AppHeader showMenu={false} searchOpen={internalPath === "/"} slimMobile />
          <main className="flex-1 pb-16 sm:pb-0">{children}</main>
          <Footer />
        </div>
        {/* Mobile-only bottom tab bar (thumb-reachable nav); desktop uses the header. */}
        <BlogBottomNav />
      </SidebarStateProvider>
      <CookieConsent darkAware />
      <ClaimToastListener />
    </AppProviders>
  );
}

// Workspace body — rendered inside AppProviders so it reads the real auth context (BlogLayout sits
// above the provider and would only ever see the signed-out fallback). The author workspace needs
// auth: signed-out visitors (and anyone whose session drops mid-edit) get sent to the dedicated blog
// login screen with a next= back to where they were, and the sidebar only mounts once authenticated.
function WorkspaceBody({ children }: { children: React.ReactNode }) {
  const tBlog = useTranslations("sidebar.blog");
  const tCommon = useTranslations("sidebar.common");
  const { ready, authenticated, isAdmin } = useAuth();

  // Once auth resolves to signed-out, route to /login. This is also the safety net for the
  // expired-session case: an authed page (e.g. /write/new auto-creating a draft) hits a 401, the
  // interceptor clears the token, `authenticated` flips false, and we land here instead of flashing
  // a confusing "you're logged out" state in place.
  useEffect(() => {
    if (ready && !authenticated) {
      const next = window.location.pathname + window.location.search;
      window.location.replace(`${blogHref("/login")}?next=${encodeURIComponent(next)}`);
    }
  }, [ready, authenticated]);

  // Hold layout until auth resolves (and while the redirect above is in flight) so we never flash
  // the sidebar before deciding.
  if (!ready || !authenticated) return <div className="flex-1" />;

  const sections = buildBlogSections(tBlog, tCommon, { isAdmin });
  return (
    <div className="flex flex-1">
      <Sidebar sections={sections} />
      <MobileSidebar sections={sections} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
