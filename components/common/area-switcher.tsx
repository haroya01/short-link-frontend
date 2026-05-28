"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AreaSwitcher() {
  const pathname = usePathname();
  const t = useTranslations("area");

  const isContent = pathname.startsWith("/content");
  const isLinks = pathname.startsWith("/links");

  return (
    <div className="inline-flex items-center rounded-full bg-slate-50 p-0.5">
      <ChipLink href="/content" active={isContent} label={t("content")} />
      <ChipLink href="/links" active={isLinks} label={t("links")} />
    </div>
  );
}

function ChipLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-[13px] font-medium transition-colors duration-200 ease-out",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
      )}
    >
      {label}
    </Link>
  );
}
