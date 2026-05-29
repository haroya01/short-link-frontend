"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PenSquare } from "lucide-react";
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

// Workspace body — rendered inside AppProviders so it reads the real auth context (BlogLayout sits
// above the provider and would only ever see the signed-out fallback). The author workspace needs
// auth: signed-out visitors get a focused sign-in screen instead of an empty sidebar plus a cold
// "please sign in" line, and the sidebar only mounts once authenticated.
function WorkspaceBody({ children }: { children: React.ReactNode }) {
  const tBlog = useTranslations("sidebar.blog");
  const tCommon = useTranslations("sidebar.common");
  const tGate = useTranslations("workspaceGate");
  const { ready, authenticated, isAdmin, signInWithGoogle } = useAuth();

  // Hold layout until auth resolves so we don't flash the sidebar then swap to the gate.
  if (!ready) return <div className="flex-1" />;

  if (!authenticated) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-50 text-accent-600">
            <PenSquare className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-[20px] font-bold tracking-tight text-slate-900">
            {tGate("title")}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{tGate("body")}</p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
          >
            {tGate("signIn")}
          </button>
        </div>
      </main>
    );
  }

  const sections = buildBlogSections(tBlog, tCommon, { isAdmin });
  return (
    <div className="flex flex-1">
      <Sidebar sections={sections} />
      <MobileSidebar sections={sections} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
