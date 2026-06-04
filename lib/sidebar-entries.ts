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
        // 글: /write is the single content home (전체/발행/임시저장/예약 tabs + 새 글). Series are now a
        // VIEW of it (내 글 → 시리즈별 보기), not a separate destination — the old 발행 글(/posts)·
        // 임시저장(/drafts)·시리즈(/series) entries were all just lenses on this same list.
        { href: "/write", label: tBlog("myPosts") },
        // 분석: /analytics + /readers(방문자) share one tabbed section now, so a single nav entry.
        { href: "/analytics", label: tBlog("analytics") },
        { href: "/leads", label: tBlog("leads") },
        { href: "/links", label: tBlog("links") },
        { href: "/curation", label: tBlog("curation") },
        { href: "/webhooks", label: tBlog("webhooks") },
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
