"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/common/error-state";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { onFollowChanged } from "@/modules/blog/lib/consequence-events";
import { followToggleClass } from "@/modules/blog/lib/follow-toggle";
import {
  POST_LOCKED_EVENT,
  dropPostGrant,
  readPostGrant,
  rememberPostKey,
  savePostGrant,
} from "@/modules/blog/lib/post-access";
import type { LockReason } from "@/modules/blog/lib/post-audience";
import {
  gateViewFrom,
  grantRejected,
  initialGateView,
  needsBrowserRead,
  type GateReason,
  type GateView,
} from "@/modules/blog/lib/post-gate-view";
import { readPostDetail, unlockPost } from "@/modules/blog/api/public-posts";
import { setUnlockedPost } from "@/modules/blog/lib/unlocked-post-store";
import { externalBrowserUrl } from "@/modules/blog/lib/in-app-handoff";

const UnlockedArticle = dynamic(() => import("./unlocked-article").then((m) => m.UnlockedArticle), {
  ssr: false,
  loading: () => <BodySkeleton />,
});

type UnlockProblem = "invalid" | "attempts" | "error";

export function PostGate({
  username,
  slug,
  postId,
  reason,
  postKey,
  locale,
  postUrl,
}: {
  username: string;
  slug: string;
  postId: number;
  reason: LockReason;
  postKey: string | null;
  locale: string;
  postUrl: string;
}) {
  const { ready, authenticated } = useAuth();
  const [view, setView] = useState<GateView>(() => initialGateView(reason));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setUnlockedPost(postId, view.kind === "open" ? view.detail : null);
  }, [postId, view]);

  useEffect(() => () => setUnlockedPost(postId, null), [postId]);

  useEffect(() => {
    if (!ready) return;
    rememberPostKey(postId, postKey);
    const grant = readPostGrant(postId);
    if (!needsBrowserRead(reason, { authenticated, grant, key: postKey })) {
      setView(initialGateView(reason));
      return;
    }
    let live = true;
    setView({ kind: "checking" });
    readPostDetail(username, slug, { key: postKey, grant }).then((read) => {
      if (!live) return;
      const next = gateViewFrom(read);
      if (grantRejected(next, grant)) dropPostGrant(postId);
      setView(next);
    });
    return () => {
      live = false;
    };
  }, [ready, authenticated, attempt, username, slug, postId, postKey, reason]);

  useEffect(() => {
    const refresh = () => setAttempt((n) => n + 1);
    const onLocked = () => {
      dropPostGrant(postId);
      refresh();
    };
    window.addEventListener(POST_LOCKED_EVENT, onLocked);
    const offFollow = onFollowChanged(refresh);
    return () => {
      window.removeEventListener(POST_LOCKED_EVENT, onLocked);
      offFollow();
    };
  }, [postId]);

  if (view.kind === "open") return <UnlockedArticle detail={view.detail} locale={locale} postUrl={postUrl} />;
  if (view.kind === "checking") return <BodySkeleton />;
  if (view.kind === "failed") return <ErrorState onRetry={() => setAttempt((n) => n + 1)} />;

  const gate = (
    <Gate
      reason={view.reason}
      username={username}
      slug={slug}
      postId={postId}
      onUnlocked={(grant, expiresAt) => {
        savePostGrant(postId, grant, expiresAt);
        setAttempt((n) => n + 1);
      }}
      onRegion={() => setView({ kind: "locked", reason: "REGION" })}
    />
  );
  if (view.reason === "REGION") return gate;
  return (
    <>
      <div data-auth-slot={ready ? undefined : "anon"} className="contents">
        {gate}
      </div>
      {!ready && (
        <div data-auth-slot="authed" className="contents">
          <BodySkeleton />
        </div>
      )}
    </>
  );
}

function Gate({
  reason,
  username,
  slug,
  postId,
  onUnlocked,
  onRegion,
}: {
  reason: GateReason;
  username: string;
  slug: string;
  postId: number;
  onUnlocked: (grant: string, expiresAt: string) => void;
  onRegion: () => void;
}) {
  const t = useTranslations("publicPost.gate");
  const headingId = useId();
  if (reason === "REGION") {
    return (
      <section data-testid="post-gate" data-reason="REGION" aria-labelledby={headingId}>
        <p id={headingId} className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
          {t("region")}
        </p>
      </section>
    );
  }
  if (reason === "FOLLOWERS") {
    return (
      <section data-testid="post-gate" data-reason="FOLLOWERS" aria-labelledby={headingId}>
        <p id={headingId} className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
          {t("followers")}
        </p>
        <div className="mt-4">
          <FollowButton username={username} initialFollowerCount={0} sourcePostId={postId} />
        </div>
        <OpenInBrowser />
      </section>
    );
  }
  return (
    <PasswordGate
      headingId={headingId}
      username={username}
      slug={slug}
      onUnlocked={onUnlocked}
      onRegion={onRegion}
    />
  );
}

function OpenInBrowser() {
  const t = useTranslations("publicPost.gate");
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    setHref(externalBrowserUrl(window.navigator.userAgent, window.location.href));
  }, []);
  if (!href) return null;
  return (
    <a
      href={href}
      data-testid="open-in-browser"
      className="focus-ring mt-3 inline-block rounded text-[13px] text-slate-500 underline-offset-2 transition-colors hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
    >
      {t("openInBrowser")}
    </a>
  );
}

function PasswordGate({
  headingId,
  username,
  slug,
  onUnlocked,
  onRegion,
}: {
  headingId: string;
  username: string;
  slug: string;
  onUnlocked: (grant: string, expiresAt: string) => void;
  onRegion: () => void;
}) {
  const t = useTranslations("publicPost.gate");
  const errorId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<UnlockProblem | null>(null);

  useEffect(() => {
    const typed = field.current?.value;
    if (typed) setPassword(typed);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password || pending) return;
    setPending(true);
    setProblem(null);
    const result = await unlockPost(username, slug, password);
    setPending(false);
    if (result.ok) {
      onUnlocked(result.grant, result.expiresAt);
      return;
    }
    if (result.reason === "region") onRegion();
    else setProblem(result.reason);
  }

  const message =
    problem === "invalid" ? t("wrongPassword") : problem === "attempts" ? t("tooManyAttempts") : problem ? t("unlockFailed") : null;

  return (
    <form data-testid="post-gate" data-reason="PASSWORD" aria-labelledby={headingId} onSubmit={submit}>
      <p id={headingId} className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
        {t("password")}
      </p>
      <div className="mt-4 flex max-w-sm gap-2">
        <input
          ref={field}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (problem) setProblem(null);
          }}
          autoComplete="off"
          aria-label={t("passwordLabel")}
          placeholder={t("passwordLabel")}
          aria-invalid={problem === "invalid" || undefined}
          aria-describedby={message ? errorId : undefined}
          className="h-9 min-w-0 flex-1 rounded-surface border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-accent-400 aria-[invalid=true]:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-accent-500 dark:aria-[invalid=true]:border-red-500"
        />
        <button
          type="submit"
          disabled={!password || pending}
          className={cn(
            followToggleClass(false),
            "disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400",
          )}
        >
          {t("open")}
        </button>
      </div>
      {message && (
        <p id={errorId} role="alert" className="mt-2 text-[13px] text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
    </form>
  );
}

function BodySkeleton() {
  const t = useTranslations("publicPost.gate");
  return (
    <div role="status" aria-busy aria-label={t("loading")} className="animate-pulse space-y-3">
      <div className="h-4 w-11/12 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
