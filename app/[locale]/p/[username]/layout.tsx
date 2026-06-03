import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/common/app-header";
import { AppProviders } from "@/components/common/app-providers";
import { BlogBottomNav } from "@/components/common/blog-bottom-nav";
import { SidebarStateProvider } from "@/components/common/sidebar-state";
import { listPublicPosts } from "@/modules/blog/api/public-posts";
import { AuthorHeader } from "./_components/author-header";
import { ProfileChrome } from "./_components/profile-chrome";

/**
 * Chrome for the public author/post surface (post / author home / series / about). Uses the SAME
 * header as the blog feed (search + product switcher + account) so navigating feed → post doesn't
 * drop those controls; on mobile they collapse into the bottom tab bar (slimMobile). Wrapped in
 * AppProviders so auth/react-query work here — without it useAuth fell back to signed-out and the
 * post's like/follow/comment never saw the real session.
 *
 * The layout itself is synchronous: the author lookup is streamed through a <Suspense> in the header
 * slot, NOT awaited up front. Awaiting it here used to block the ENTIRE subtree — so a post (which
 * doesn't even render the author header) sat on a blank screen until that fetch resolved, then the
 * whole page popped in at once. Streaming lets the post's own loading.tsx skeleton paint instantly
 * while the (tab-only) header fills in behind it.
 */
export default function AuthorChromeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; username: string }>;
}) {
  return (
    <AppProviders>
      <SidebarStateProvider>
        {/* Header inside the dark wrapper so its translucent bg blends with the dark page (not the
            white body) — otherwise the sticky nav reads as a washed grey band in dark mode. */}
        <div className="flex min-h-screen flex-col dark:bg-slate-950 dark:text-slate-300">
          {/* Author/post pages are the blog product → tell the switcher so it offers "kurl" (links),
              not "blog.kurl" (currentProduct() doesn't recognise the /p/ + author-subdomain surface). */}
          <AppHeader showMenu={false} slimMobile product="blog" />
          <div className="flex-1 pb-16 sm:pb-0">
            {/* ProfileChrome renders the header slot ONLY on the tab routes (글·시리즈·소개·…); on a
                post / series-detail route it drops the header and renders children alone. So the
                streamed author fetch below only materially matters where the header is shown. */}
            <ProfileChrome
              header={
                <Suspense fallback={<AuthorHeaderSkeleton />}>
                  <AuthorHeaderSlot params={params} />
                </Suspense>
              }
            >
              {children}
            </ProfileChrome>
          </div>
        </div>
        <BlogBottomNav />
      </SidebarStateProvider>
    </AppProviders>
  );
}

/** Async author lookup, isolated behind Suspense so it never blocks the page content. */
async function AuthorHeaderSlot({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { username } = await params;
  // cached → deduped with the tab pages, so the header doesn't re-fetch on a tab switch.
  const result = await listPublicPosts(username);
  const author = result.ok ? result.data.author : null;
  return author ? <AuthorHeader author={author} /> : null;
}

/** Header-shaped placeholder while the author streams in (avatar · handle · bio · tab row). */
function AuthorHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-slate-200/80 dark:bg-slate-700/80" />
          <div className="h-3.5 w-56 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="mt-6 flex gap-5 border-b border-slate-100 pb-3 dark:border-slate-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-12 rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
