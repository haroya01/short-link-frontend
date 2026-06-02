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
// Direction for the tab content slide (글/시리즈/소개), unified with the feed's 최신/인기/팔로잉. The author
// surface hard-navigates (subdomain model) and rides the cross-document View Transition, so the slide
// direction is chosen here in `pagereveal` — registered inline so it runs before the event fires — and
// realized by the ::view-transition(author-content) rules in globals.css. It also parks the previous
// tab index on window so the tab underline can glide from it (AuthorTabs).
const NAV_DIRECTION_SCRIPT = `(function(){
var H=document.documentElement,K="kurl:author-tab-idx";
function ix(p){p=p.replace(/\\/+$/,"")||"/";
if(p==="/")return 0;if(p==="/series")return 1;if(p==="/about")return 2;if(p==="/liked")return 3;if(p==="/bookmarks")return 4;
if(/^\\/[a-z]{2}\\/p\\/[^/]+(\\/(series|about|liked|bookmarks))?$/.test(p)){
if(p.endsWith("/series"))return 1;if(p.endsWith("/about"))return 2;if(p.endsWith("/liked"))return 3;if(p.endsWith("/bookmarks"))return 4;return 0;}
return null;}
addEventListener("pagereveal",function(e){try{
var cur=ix(location.pathname);
if(cur===null){H.removeAttribute("data-author-nav");return;}
var raw=sessionStorage.getItem(K),prev=raw==null?null:+raw;
window.__kurlAuthorNavPrev=prev;sessionStorage.setItem(K,String(cur));
if(e.viewTransition&&prev!=null&&prev!==cur){
H.dataset.authorNav=cur>prev?"fwd":"back";
e.viewTransition.finished.finally(function(){H.removeAttribute("data-author-nav");});
}else{H.removeAttribute("data-author-nav");}
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
