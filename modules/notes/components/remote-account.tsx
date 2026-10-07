"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/modules/blog/components/avatar";
import { EmptyState } from "@/components/common/empty-state";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { blogPath } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { followToggleClass } from "@/modules/blog/lib/follow-toggle";
import {
  getRemoteAccount,
  listRemoteAccountNotes,
  listRemoteFollowing,
  lookupRemoteAccount,
  setRemoteFollow,
  type RemoteAccount,
} from "@/modules/notes/api/notes";
import { NoteList } from "./note-list";

function failure(error: unknown): "disabled" | "missing" | "invalid" | "other" {
  const code = error instanceof ApiError ? error.detail.code : undefined;
  if (code === "FEDERATION_DISABLED") return "disabled";
  if (code === "REMOTE_ACCOUNT_NOT_FOUND") return "missing";
  if (code === "REMOTE_ACCOUNT_INVALID") return "invalid";
  return "other";
}

/** Follow an account elsewhere: a request until its server accepts, as on Mastodon. */
export function RemoteFollowButton({
  account,
  onChange,
}: {
  account: RemoteAccount;
  onChange: (next: RemoteAccount) => void;
}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const on = account.following || account.requested;

  async function toggle() {
    if (busy) return;
    if (on) {
      const ok = await confirm({
        title: account.following
          ? t("remoteUnfollowConfirm", { acct: account.acct })
          : t("remoteCancelRequestConfirm"),
        confirmLabel: account.following ? t("remoteUnfollow") : t("remoteCancelRequest"),
        destructive: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    const previous = account;
    onChange({ ...account, requested: !on, following: false });
    try {
      onChange(await setRemoteFollow(account.id, !on));
    } catch (error) {
      onChange(previous);
      toast(t(`remoteError.${failure(error)}`), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        className={followToggleClass(on, true)}
      >
        {on && <Check className="mr-1 h-3.5 w-3.5" aria-hidden />}
        {account.following ? t("remoteFollowing") : account.requested ? t("remoteRequested") : t("remoteFollow")}
      </button>
      {confirmDialog}
    </>
  );
}

function AccountRow({ account, onChange }: { account: RemoteAccount; onChange: (next: RemoteAccount) => void }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <BlogLink
        href={blogPath(`/remote/${account.id}`)}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg"
      >
        <Avatar src={account.avatarUrl} name={account.username || account.acct} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            {account.displayName || account.username || account.acct}
          </span>
          <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">@{account.acct}</span>
        </span>
      </BlogLink>
      <RemoteFollowButton account={account} onChange={onChange} />
    </div>
  );
}

/** Search results for @user@server: the account, found the way Mastodon finds one. */
export function RemoteAccountResult({ query }: { query: string }) {
  const t = useTranslations("notes");
  const [account, setAccount] = useState<RemoteAccount | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "disabled">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    lookupRemoteAccount(query)
      .then((found) => {
        if (!alive) return;
        setAccount(found);
        setState("ready");
      })
      .catch((error) => {
        if (!alive) return;
        setState(error instanceof ApiError && error.status === 401 ? "disabled" : "missing");
      });
    return () => {
      alive = false;
    };
  }, [query]);

  return (
    <section aria-label={t("remoteAccountSection")} className="mb-6 border-b border-slate-200 dark:border-slate-800">
      <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        <Globe className="h-3.5 w-3.5" aria-hidden />
        {t("remoteAccountSection")}
      </h2>
      {state === "ready" && account ? (
        <AccountRow account={account} onChange={setAccount} />
      ) : (
        <p className="py-4 text-[14px] text-slate-500 dark:text-slate-400">
          {state === "loading" ? t("remoteLookingUp") : state === "disabled" ? t("remoteSignIn") : t("remoteNotFound")}
        </p>
      )}
    </section>
  );
}

export function RemoteAccountScreen({ id }: { id: number }) {
  const t = useTranslations("notes");
  const [account, setAccount] = useState<RemoteAccount | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback((page: number) => listRemoteAccountNotes(id, page), [id]);

  useEffect(() => {
    let alive = true;
    getRemoteAccount(id)
      .then((found) => alive && setAccount(found))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  if (failed) {
    return <EmptyState title={t("remoteNotFound")} className="mt-16" />;
  }
  if (!account) {
    return <div className="mt-10 h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-hidden />;
  }
  const caption = account.following
    ? t("remoteCaptionFollowing", { domain: account.domain })
    : account.requested
      ? t("remoteCaptionRequested", { domain: account.domain })
      : t("remoteCaption", { domain: account.domain });
  return (
    <div>
      <header className="flex items-start gap-4">
        <Avatar src={account.avatarUrl} name={account.username || account.acct} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {account.displayName || account.username || account.acct}
          </h1>
          <p className="truncate text-[14px] text-slate-500 dark:text-slate-400">@{account.acct}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <RemoteFollowButton account={account} onChange={setAccount} />
            <a
              href={account.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1 rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("remoteOpenOnServer", { domain: account.domain })}
            </a>
          </div>
          <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">{caption}</p>
        </div>
      </header>
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800">
        <NoteList
          key={id}
          load={load}
          filterContext="account"
          empty={<EmptyState title={t("remoteNoNotes")} description={t("remoteNoNotesHint")} className="mt-8" />}
        />
      </div>
    </div>
  );
}

/** Blog settings: accounts followed on other servers, requests included. */
export function RemoteFollowingSettings() {
  const t = useTranslations("notes");
  const [accounts, setAccounts] = useState<RemoteAccount[] | null>(null);

  useEffect(() => {
    let alive = true;
    listRemoteFollowing()
      .then((found) => alive && setAccounts(found))
      .catch(() => alive && setAccounts([]));
    return () => {
      alive = false;
    };
  }, []);

  if (accounts === null) return null;
  return (
    <section aria-labelledby="remote-following-title" className="mt-8">
      <h2 id="remote-following-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("remoteFollowingTitle")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("remoteFollowingHint")}</p>
      {accounts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("remoteFollowingEmpty")}
        </p>
      ) : (
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onChange={(next) => setAccounts((current) => current?.map((a) => (a.id === next.id ? next : a)) ?? null)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
