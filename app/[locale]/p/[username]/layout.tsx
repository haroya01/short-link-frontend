import type { ReactNode } from "react";
import { AppHeader } from "@/components/common/app-header";
import { AppProviders } from "@/components/common/app-providers";
import { BlogBottomNav } from "@/components/common/blog-bottom-nav";
import { SidebarStateProvider } from "@/components/common/sidebar-state";

/**
 * Chrome for the public author/post surface (post / author home / series / about). Uses the SAME
 * header as the blog feed (search + product switcher + account) so navigating feed → post doesn't
 * drop those controls; on mobile they collapse into the bottom tab bar (slimMobile). Wrapped in
 * AppProviders so auth/react-query work here — without it useAuth fell back to signed-out and the
 * post's like/follow/comment never saw the real session.
 */
export default function AuthorChromeLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <SidebarStateProvider>
        <AppHeader showMenu={false} slimMobile />
        <div className="pb-16 sm:pb-0">{children}</div>
        <BlogBottomNav />
      </SidebarStateProvider>
    </AppProviders>
  );
}
