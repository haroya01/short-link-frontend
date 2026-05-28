import type { SidebarSection } from "@/components/common/sidebar";

type Translator = (key: string) => string;

export function buildContentSections(
  tContent: Translator,
  tCommon: Translator,
  { isAdmin }: { isAdmin: boolean },
): SidebarSection[] {
  return [
    {
      entries: [
        {
          href: "/content",
          label: tContent("overview"),
          active: (p) => p === "/content",
        },
        { href: "/content/write", label: tContent("write") },
        { href: "/content/posts", label: tContent("posts") },
        { href: "/content/curation", label: tContent("curation") },
        { href: "/content/readers", label: tContent("readers") },
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

export function buildLinksSections(
  tLinks: Translator,
  tCommon: Translator,
  { isAdmin }: { isAdmin: boolean },
): SidebarSection[] {
  return [
    {
      entries: [
        {
          href: "/links",
          label: tLinks("home"),
          active: (p) => p === "/links",
        },
        { href: "/links/campaigns", label: tLinks("campaigns") },
        { href: "/links/qr", label: tLinks("qr") },
        { href: "/links/ctas", label: tLinks("ctas") },
        { href: "/links/stats", label: tLinks("stats") },
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
