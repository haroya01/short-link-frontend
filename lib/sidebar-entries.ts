import type { SidebarSection } from "@/components/common/sidebar";

type Translator = (key: string) => string;

/**
 * blog.kurl.me 워크스페이스 사이드바.
 * "Links" 메뉴는 kurl.me product 진입이 아니라 이 사용자의 글 안에 박힌 링크들의 성과 view.
 * Cross-product 진입은 헤더의 apps grid 가 처리한다.
 */
export function buildBlogSections(
  tBlog: Translator,
  tCommon: Translator,
  { isAdmin }: { isAdmin: boolean },
): SidebarSection[] {
  return [
    {
      entries: [
        // 글: /write is already the unified post list (전체/발행/임시저장/예약 tabs + 새 글) — the
        // separate 발행 글(/posts) · 임시저장(/drafts) entries were just its filtered subsets.
        { href: "/write", label: tBlog("myPosts") },
        { href: "/series", label: tBlog("series") },
        // 분석: /analytics + /readers(방문자) share one tabbed section now, so a single nav entry.
        { href: "/analytics", label: tBlog("analytics") },
        { href: "/leads", label: tBlog("leads") },
        { href: "/links", label: tBlog("links") },
        { href: "/curation", label: tBlog("curation") },
      ],
    },
    {
      entries: [{ href: "/settings", label: tCommon("settings") }],
    },
  ];
}

/**
 * kurl.me 워크스페이스 사이드바. 단축링크 product.
 */
export function buildLinksSections(
  tLinks: Translator,
  tCommon: Translator,
  { isAdmin }: { isAdmin: boolean },
): SidebarSection[] {
  return [
    {
      entries: [
        { href: "/dashboard", label: tLinks("links") },
        { href: "/campaigns", label: tLinks("campaigns") },
        { href: "/ctas", label: tLinks("ctas") },
        { href: "/stats", label: tLinks("stats") },
        { href: "/settings/profile", label: tLinks("profile") },
      ],
    },
    {
      entries: [
        { href: "/settings", label: tCommon("settings") },
        ...(isAdmin ? [{ href: "/admin", label: tCommon("admin") }] : []),
      ],
    },
  ];
}
