"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PersonMatch } from "@/modules/blog/api/people";
import { authorHref } from "@/modules/blog/lib/author-href";
import type { RemoteAccount } from "@/modules/notes/api/notes";
import { blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { BlogLink } from "./blog-link";

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
                <Avatar src={person.avatarUrl} name={name} seed={person.userId} size={dense ? "sm" : "md"} />
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

export function LiveRemotePeople({
  accounts,
  onNavigate,
  dense = false,
}: {
  accounts: RemoteAccount[];
  onNavigate: () => void;
  dense?: boolean;
}) {
  const t = useTranslations("notes");
  const headingId = useId();
  if (accounts.length === 0) return null;
  return (
    <section
      aria-labelledby={headingId}
      data-testid="live-remote-people"
      className="border-b border-slate-100 py-1 dark:border-slate-800"
    >
      <h3 id={headingId} className="px-3 pb-0.5 pt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {t("remoteSection")}
      </h3>
      <ul>
        {accounts.map((account) => (
          <li key={account.id}>
            <BlogLink
              href={blogPath(`/remote/${account.id}`)}
              onClick={onNavigate}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-surface transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                dense ? "px-3 py-2" : "px-3 py-2.5",
              )}
            >
              <Avatar
                src={account.avatarUrl}
                name={account.username || account.acct}
                seed={null}
                size={dense ? "sm" : "md"}
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "truncate font-semibold text-slate-900 dark:text-slate-100",
                    dense ? "text-[13px]" : "text-[14px]",
                  )}
                >
                  {account.displayName?.trim() || account.username}
                </span>
                <span className={cn("truncate text-slate-500 dark:text-slate-400", dense ? "text-[11px]" : "text-[12px]")}>
                  @{account.acct}
                </span>
              </span>
            </BlogLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
