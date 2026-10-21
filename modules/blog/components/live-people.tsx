"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PersonMatch } from "@/modules/blog/api/people";
import { authorHref } from "@/modules/blog/lib/author-href";
import type { RemoteAccount } from "@/modules/notes/api/notes";
import type { LiveRemoteLookup } from "@/modules/notes/lib/use-remote-resolution";
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
                <Avatar src={person.avatarUrl} name={name} handle={person.username} size={dense ? "sm" : "md"} />
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
  lookup = null,
  hint = false,
  onNavigate,
  dense = false,
}: {
  accounts: RemoteAccount[];
  lookup?: LiveRemoteLookup | null;
  hint?: boolean;
  onNavigate: () => void;
  dense?: boolean;
}) {
  const t = useTranslations("notes");
  const headingId = useId();
  const found =
    lookup?.state === "account" && !accounts.some((account) => account.id === lookup.account.id)
      ? [lookup.account, ...accounts]
      : accounts;
  const status =
    lookup?.state === "pending"
      ? t("remoteLookingUp")
      : lookup?.state === "missing"
        ? t("remoteSearchNotFound", { domain: lookup.domain })
        : lookup?.state === "unreachable"
          ? t("remoteSearchUnreachable", { domain: lookup.domain })
          : null;
  if (found.length === 0 && !status) {
    return hint ? (
      <p
        data-testid="live-remote-hint"
        className={cn(
          "border-b border-slate-100 px-3 text-slate-500 dark:border-slate-800 dark:text-slate-400",
          dense ? "py-2 text-[12px]" : "py-2.5 text-[13px]",
        )}
      >
        {t("remoteSearchHint")}
      </p>
    ) : null;
  }
  return (
    <section
      aria-labelledby={headingId}
      data-testid="live-remote-people"
      className="border-b border-slate-100 py-1 dark:border-slate-800"
    >
      <h3 id={headingId} className="px-3 pb-0.5 pt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {t("remoteSection")}
      </h3>
      {found.length === 0 ? (
        <p role="status" className={cn("px-3 text-slate-500 dark:text-slate-400", dense ? "py-2 text-[12px]" : "py-2.5 text-[13px]")}>
          {status}
        </p>
      ) : (
        <ul>
          {found.map((account) => (
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
                  handle={account.acct}
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
      )}
    </section>
  );
}
