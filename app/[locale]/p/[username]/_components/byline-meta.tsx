"use client";

import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { countryName } from "@/lib/utils";
import { bylineCondition, type AudienceFields, type ConditionPart } from "@/modules/blog/lib/post-audience";
import { readingMinutes } from "@/modules/blog/lib/reading-minutes";
import { useUnlockedPost } from "@/modules/blog/lib/unlocked-post-store";

export function BylineMeta({
  postId,
  authorUsername,
  publishedAt,
  dateLabel,
  minutes,
  access,
}: {
  postId: number;
  authorUsername: string;
  publishedAt: string;
  dateLabel: string;
  minutes: number | null;
  access: AudienceFields & { room?: { name: string } | null };
}) {
  const t = useTranslations("publicPost");
  const tNotes = useTranslations("notes");
  const locale = useLocale();
  const { me } = useAuth();
  const opened = useUnlockedPost(postId);
  const post = opened?.post ?? access;
  const shownMinutes = opened ? readingMinutes(opened.blocks) : minutes;
  const room = post.room?.name;
  const parts = bylineCondition(post, { owner: me?.username === authorUsername }).filter(
    (part) => part.kind !== "ROOM" || Boolean(room),
  );

  function label(part: ConditionPart): string {
    if (part.kind === "ROOM") return tNotes("roomMembersOnly", { room: room ?? "" });
    if (part.kind !== "COUNTRIES") return t(`condition.${part.kind}`);
    const names = part.codes.map((code) => countryName(code, locale)).sort((a, b) => a.localeCompare(b, locale));
    return t("condition.COUNTRIES", { countries: names.join(t("condition.separator")) });
  }

  return (
    <>
      <time dateTime={publishedAt}>{dateLabel}</time>
      {shownMinutes != null && (
        <>
          {" · "}
          {t("readingTime", { minutes: shownMinutes })}
        </>
      )}
      {parts.map((part) => (
        <Fragment key={part.kind}>
          {" · "}
          <span data-post-condition={part.kind}>{label(part)}</span>
        </Fragment>
      ))}
    </>
  );
}
