"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export type TocHeading = { id: string; text: string; level: number };

/**
 * velog-style floating table of contents. Shown only on xl+ screens (positioned in the right
 * margin by the page) and only when there are at least two headings. Scrollspy via
 * IntersectionObserver highlights the section currently near the top of the viewport.
 */
export function PostToc({ headings }: { headings: TocHeading[] }) {
  const t = useTranslations("publicPost");
  const [active, setActive] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0 },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label={t("toc")} className="border-l border-slate-100 pl-4 text-[13px] leading-relaxed">
      <ul className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
            <a
              href={`#${h.id}`}
              className={`block truncate transition-colors ${
                active === h.id
                  ? "font-medium text-accent-700"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
