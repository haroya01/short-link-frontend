"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PersonMatch } from "@/modules/blog/api/people";
import { authorHref } from "@/modules/blog/lib/author-href";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

export function LivePeople({
  people,
  onNavigate,
  dense = false,
}: {
  people: PersonMatch[];
  onNavigate: () => void;
  dense?: boolean;
}) {
  const t = useTranslations("publicFeed");
  const locale = useLocale();
  if (people.length === 0) return null;
  return (
    <section
      aria-label={t("searchPeopleTab")}
      data-testid="live-people"
      className="border-b border-slate-100 py-1 dark:border-slate-800"
    >
      <ul>
        {people.map((person) => {
          const name = person.displayName?.trim() || person.username;
          return (
            <li key={person.username}>
              <a
                href={authorHref(person.username, locale)}
                onClick={onNavigate}
                className={cn(
                  "focus-ring flex items-center gap-3 rounded-surface transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  dense ? "px-3 py-2" : "px-3 py-2.5",
                )}
              >
                <Avatar src={person.avatarUrl} name={name} size={dense ? "sm" : "md"} />
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate font-semibold text-slate-900 dark:text-slate-100",
                      dense ? "text-[13px]" : "text-[14px]",
                    )}
                  >
                    {name}
                  </span>
                  {name !== person.username && (
                    <span
                      className={cn(
                        "truncate text-slate-500 dark:text-slate-400",
                        dense ? "text-[11px]" : "text-[12px]",
                      )}
                    >
                      @{person.username}
                    </span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
