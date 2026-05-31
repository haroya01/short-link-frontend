import type { ReactNode } from "react";
import { blogHref } from "@/lib/host";
import { Logo } from "@/components/common/logo";
import { AppProviders } from "@/components/common/app-providers";
import { BlogBottomNav } from "@/components/common/blog-bottom-nav";

/**
 * Minimal chrome for author-subdomain pages (post / author home / series / about). These live on
 * {username}.kurl.me with no global nav, so without this a reader who arrives on a post has no
 * discoverable way back to the kurl blog. A thin top bar with the blog.kurl wordmark gives every
 * page a consistent return path; the mobile bottom tab bar matches the rest of the blog.
 *
 * Wrapped in AppProviders so auth/react-query work here too — previously this tree had no provider,
 * so useAuth fell back to signed-out and the post's like/follow/comment never saw the real session.
 */
export default function AuthorChromeLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
          <a
            href={blogHref("/")}
            aria-label="blog.kurl"
            className="mark-hoverable inline-flex rounded focus-ring"
          >
            <Logo variant="blog" animated />
          </a>
        </div>
      </header>
      <div className="pb-16 sm:pb-0">{children}</div>
      <BlogBottomNav />
    </AppProviders>
  );
}
