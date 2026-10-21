"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { askToSignIn } from "@/components/auth/login-prompt";
import { ErrorState } from "@/components/common/error-state";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { blogCta } from "@/modules/blog/components/blog-cta";
import {
  getRoomInviteLanding,
  joinRoomByInvite,
  personName,
  type RoomInviteLanding,
  type RoomInviteUnusable,
} from "@/modules/rooms/api/rooms";
import { roomPath } from "@/modules/rooms/lib/room-href";
import { RoomFaces } from "./room-faces";

type Blocked = RoomInviteUnusable | "removed" | "missing";

const BLOCK_TITLE: Record<Blocked, string> = {
  expired: "inviteExpired",
  disabled: "inviteDisabled",
  used_up: "inviteUsedUp",
  full: "inviteFull",
  removed: "inviteRemoved",
  missing: "inviteMissing",
};

function blockedBy(error: unknown): Blocked | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 404) return "missing";
  if (error.status === 403) return "removed";
  if (error.status === 409) return "full";
  if (error.status === 410) {
    const reason = String(error.detail.detail ?? "").match(/(disabled|expired|used_up|full)\s*$/)?.[1];
    return (reason as RoomInviteUnusable | undefined) ?? "disabled";
  }
  return null;
}

export function RoomJoin({ code }: { code: string }) {
  const t = useTranslations("rooms");
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const [landing, setLanding] = useState<RoomInviteLanding | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [requested, setRequested] = useState(false);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const autoJoined = useRef(false);

  const load = useCallback(() => {
    setFailed(false);
    getRoomInviteLanding(code)
      .then(setLanding)
      .catch(() => setFailed(true));
  }, [code]);
  useEffect(load, [load]);

  async function join() {
    setJoining(true);
    try {
      const result = await joinRoomByInvite(code);
      if (result.status === "requested") setRequested(true);
      else router.replace(roomPath(result.roomId));
    } catch (error) {
      setBlocked(blockedBy(error) ?? null);
      if (!blockedBy(error)) setFailed(true);
    } finally {
      setJoining(false);
    }
  }

  useEffect(() => {
    if (!ready || !authenticated || !landing?.usable || autoJoined.current) return;
    if (new URLSearchParams(window.location.search).get("join") !== "1") return;
    autoJoined.current = true;
    void join();
  });

  if (failed) return <ErrorState title={t("joinFailed")} onRetry={load} />;
  if (landing === undefined) return <div aria-busy="true" className="h-64" />;

  const block: Blocked | null = blocked ?? (landing === null ? "missing" : !landing.usable ? (landing.reason ?? "disabled") : null);
  if (block || !landing) {
    return (
      <div data-testid="room-join" data-room-join-blocked={block ?? "missing"}>
        {landing && (
          <>
            <RoomFaces people={landing.members} limit={8} size="md" className="opacity-60" />
            <p className="mt-4 text-[15px] font-semibold text-slate-500 dark:text-slate-400">{landing.roomName}</p>
          </>
        )}
        <BlogEmpty
          className={landing ? "pt-2" : undefined}
          title={t(BLOCK_TITLE[block ?? "missing"])}
          action={
            <BlogLink href={blogPath("/")} className={blogCta({ variant: "text" })}>
              {t("goHome")}
            </BlogLink>
          }
        />
      </div>
    );
  }

  return (
    <section data-testid="room-join" className="py-6 sm:py-10">
      <RoomFaces people={landing.members} limit={8} size="md" />
      <h1 className="mt-5 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {landing.roomName}
      </h1>
      <p className="mt-1.5 text-[15px] text-slate-600 dark:text-slate-400">
        {landing.inviter && (
          <>
            {t("invitedBy", { name: personName(landing.inviter) })}
            <span aria-hidden> · </span>
          </>
        )}
        {t("memberCount", { count: landing.memberCount })}
      </p>
      {landing.approval && !requested && (
        <p className="mt-4 text-[14px] text-slate-600 dark:text-slate-400">{t("approvalNote")}</p>
      )}
      <div className="mt-6">
        {requested ? (
          <p role="status" className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            {t("requested")}
          </p>
        ) : !ready ? (
          <div aria-hidden className="h-10" />
        ) : authenticated ? (
          <button
            type="button"
            onClick={() => void join()}
            disabled={joining}
            className={cn(blogCta(), "disabled:opacity-60")}
          >
            {landing.approval ? t("requestJoin") : t("join")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => askToSignIn("room", `${window.location.origin}${window.location.pathname}?join=1`)}
            className={blogCta()}
          >
            {t("signInToJoin")}
          </button>
        )}
      </div>
    </section>
  );
}
