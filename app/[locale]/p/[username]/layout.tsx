import type { ReactNode } from "react";
import { blogHref } from "@/lib/host";
import { Logo } from "@/components/common/logo";

/**
 * Minimal chrome for author-subdomain pages (post / author home / series / about). These live on
 * {username}.kurl.me with no global nav, so without this a reader who arrives on a post has no
 * discoverable way back to the kurl blog (only the browser back button, or the bottom tag chips —
 * which exist only if the post is tagged). A thin top bar with the blog.kurl wordmark gives every
 * page one consistent, tag-independent return path to the feed (cross-host in production).
 */
export default function AuthorChromeLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
      {children}
    </>
  );
}
