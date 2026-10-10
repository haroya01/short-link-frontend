"use client";

import { usePathname } from "next/navigation";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorTail } from "./profile-chrome";

export function AboutLink({ href, label }: { href: string; label: string }) {
  const tail = authorTail(usePathname());
  const active = tail.length === 1 && tail[0] === "about";
  return (
    <BlogLink
      href={href}
      data-about-link
      aria-current={active ? "page" : undefined}
      className={`focus-ring rounded-sm underline-offset-4 transition-colors hover:underline ${
        active
          ? "font-medium text-slate-900 dark:text-slate-100"
          : "text-slate-600 hover:text-accent-700 dark:text-slate-300 dark:hover:text-accent-400"
      }`}
    >
      {label}
    </BlogLink>
  );
}
