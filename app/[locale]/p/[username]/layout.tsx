import type { ReactNode } from "react";
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
 */
export default async function AuthorChromeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; username: string }>;
}) {
  // Fetch the author here (cached → deduped with the tab pages) so the header lives in this persistent
  // layout and never re-mounts on a tab switch. ProfileChrome shows it only on the tab routes.
  const { username } = await params;
  const result = await listPublicPosts(username);
  const author = result.ok ? result.data.author : null;
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
            {author ? (
              <ProfileChrome header={<AuthorHeader author={author} />}>{children}</ProfileChrome>
            ) : (
              children
            )}
          </div>
        </div>
        <BlogBottomNav />
      </SidebarStateProvider>
    </AppProviders>
  );
}
