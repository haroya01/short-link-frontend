"use client";

import { useEffect } from "react";
import { notFound, usePathname } from "next/navigation";
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
import { WorkspaceSkeleton } from "@/modules/blog/components/skeleton";

// Author workspace paths get the sidebar. Everything else on blog.kurl.me — the public feed at
// "/" and any other public page — gets the chrome-light header with no sidebar, so anyone can
// browse. stripLocale also drops the /blog (prod rewrite) or /blog-preview (dev) prefix.
const WORKSPACE_PATHS = [
  "/write",
  "/posts",
  "/drafts",
  "/series",
  "/analytics",
  "/curation",
  "/leads",
  "/webhooks",
  "/settings",
  "/admin",
];

/** Product prefix the blog is served under on this deploy (post-locale): "/blog-preview", "/blog",
 *  or "" on the blog host. Prepended to sidebar entry hrefs so they don't 404 into the links product. */
function blogBasePath(fullPathname: string): string {
  const afterLocale = fullPathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  if (afterLocale === "/blog-preview" || afterLocale.startsWith("/blog-preview/")) return "/blog-preview";
  if (afterLocale === "/blog" || afterLocale.startsWith("/blog/")) return "/blog";
  return "";
}

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
  // 에디터 캔버스(/write/new · /write/{id})는 자기 스크롤을 가진 100dvh-헤더 표면 — 아래에 Footer 가
  // 있으면 페이지 스크롤이 하나 더 생겨(이중 스크롤 컨텍스트) 휠/스와이프가 본문과 페이지 사이에서
  // 튕긴다. 허브(/write)와 다른 워크스페이스 페이지는 일반 문서 흐름이라 Footer 유지.
  const isEditorCanvas = /^\/write\/[^/]+$/.test(internalPath);

  if (isWorkspace) {
    return (
      <AppProviders>
        <SidebarStateProvider>
          <div className="flex min-h-screen flex-col dark:bg-slate-950 dark:text-slate-300">
            <AppHeader product="blog" />
            <WorkspaceBody>{children}</WorkspaceBody>
            {!isEditorCanvas && <Footer />}
          </div>
        </SidebarStateProvider>
        <CookieConsent darkAware />
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
          <AppHeader showMenu={false} searchOpen={internalPath === "/"} slimMobile product="blog" />
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
  const pathname = usePathname();
  // Product base for the sidebar links: on a path-based deploy the blog lives under /blog-preview
  // (or /blog), and the entry hrefs are product-relative — without this prefix they'd 404 into the
  // links product. On the blog host the prefix is stripped by rewrite, so base is "".
  const base = blogBasePath(pathname);
  // Admin surfaces are hidden behind a hard 404, not the friendly login bounce: a visitor who isn't
  // a signed-in admin — no token, expired token, or a valid non-admin token — must never learn the
  // route exists. So the login redirect below is skipped for /admin, and the render-time guard 404s.
  const isAdminPath = matchesAny(stripLocale(pathname), ["/admin"]);

  // Once auth resolves to signed-out, route to /login. This is also the safety net for the
  // expired-session case: an authed page (e.g. /write/new auto-creating a draft) hits a 401, the
  // interceptor clears the token, `authenticated` flips false, and we land here instead of flashing
  // a confusing "you're logged out" state in place. Admin paths opt out — they 404 instead.
  useEffect(() => {
    if (ready && !authenticated && !isAdminPath) {
      const next = window.location.pathname + window.location.search;
      window.location.replace(`${blogHref("/login")}?next=${encodeURIComponent(next)}`);
    }
  }, [ready, authenticated, isAdminPath]);

  // Hard 404 for admin paths the moment auth resolves to anything but a signed-in admin.
  if (isAdminPath && ready && (!authenticated || !isAdmin)) {
    notFound();
  }

  // Hold the sidebar until auth resolves (and while the login redirect above is in flight) so we
  // never flash it before deciding — but show a content skeleton instead of a blank pane, so a
  // workspace navigation reads as "loading this page", never an empty white flash. Admin paths only
  // wait on `ready` (their auth verdict is the 404 above), not on `authenticated`.
  if (!ready || (!authenticated && !isAdminPath)) {
    return (
      <div className="flex flex-1" aria-busy>
        <main className="min-w-0 flex-1">
          <WorkspaceSkeleton />
        </main>
      </div>
    );
  }

  const sections = buildBlogSections(tBlog, tCommon, { isAdmin });
  // 에디터 캔버스(/write/new · /write/{id})에선 데스크톱 사이드바를 내린다 — 글쓰기는 종이가
  // 주인공이라 워크스페이스 내비는 소음이고, 사이드바 폭만큼 캔버스가 뷰포트 중앙에서 밀려
  // "왼쪽에 치우친 에디터"로 읽혔다. 돌아가는 길은 에디터 헤더의 ← 글 목록. 모바일 드로어는
  // 유지(헤더 햄버거가 여는 대상이 사라지면 죽은 버튼이 된다).
  const isEditorCanvas = /^\/write\/[^/]+$/.test(stripLocale(pathname));
  return (
    <div className="flex flex-1">
      {!isEditorCanvas && <Sidebar sections={sections} basePath={base} />}
      <MobileSidebar sections={sections} basePath={base} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
