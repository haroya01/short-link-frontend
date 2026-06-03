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
// Parks the previous tab index (글 0 · 시리즈 1 · 소개 2 · 좋아요 3 · 북마크 4) on window + sessionStorage at
// `pagereveal` — registered inline so it runs before the event fires — so the tab underline can glide
// from the prior tab on the new page (AuthorTabs reads it via author-tab-direction). The author surface
// hard-navigates (subdomain model); the tab content itself just rides the calm root crossfade.
const NAV_DIRECTION_SCRIPT = `(function(){
var K="kurl:author-tab-idx";
function ix(p){p=p.replace(/\\/+$/,"")||"/";
if(p==="/")return 0;if(p==="/series")return 1;if(p==="/about")return 2;if(p==="/liked")return 3;if(p==="/bookmarks")return 4;
if(/^\\/[a-z]{2}\\/p\\/[^/]+(\\/(series|about|liked|bookmarks))?$/.test(p)){
if(p.endsWith("/series"))return 1;if(p.endsWith("/about"))return 2;if(p.endsWith("/liked"))return 3;if(p.endsWith("/bookmarks"))return 4;return 0;}
return null;}
addEventListener("pagereveal",function(){try{
var cur=ix(location.pathname);
if(cur===null)return;
var raw=sessionStorage.getItem(K),prev=raw==null?null:+raw;
window.__kurlAuthorNavPrev=prev;sessionStorage.setItem(K,String(cur));
}catch(_){}});
})();`;

export default function AuthorChromeLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: NAV_DIRECTION_SCRIPT }} />
      <SidebarStateProvider>
        {/* Header inside the dark wrapper so its translucent bg blends with the dark page (not the
            white body) — otherwise the sticky nav reads as a washed grey band in dark mode. */}
        <div className="flex min-h-screen flex-col dark:bg-slate-950 dark:text-slate-300">
          {/* Author/post pages are the blog product → tell the switcher so it offers "kurl" (links),
              not "blog.kurl" (currentProduct() doesn't recognise the /p/ + author-subdomain surface). */}
          <AppHeader showMenu={false} slimMobile product="blog" />
          <div className="flex-1 pb-16 sm:pb-0">{children}</div>
        </div>
        <BlogBottomNav />
      </SidebarStateProvider>
    </AppProviders>
  );
}
