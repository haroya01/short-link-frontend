"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Globe, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { askToSignIn } from "@/components/auth/login-prompt";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { Avatar } from "@/modules/blog/components/avatar";
import { BlogEmpty } from "@/modules/blog/components/blog-empty";
import { useConfirm } from "@/components/ui/use-confirm";
import { useToast } from "@/components/ui/toast";
import { useDismiss } from "@/hooks/use-dismiss";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { followToggleClass } from "@/modules/blog/lib/follow-toggle";
import {
  hiddenFromViewer,
  knowsRemoteSafety,
  muteRemote,
  setRemoteBlocked,
  unmuteRemote,
} from "@/modules/notes/api/remote-safety";
import {
  getRemoteAccount,
  listDomainBlocks,
  listRemoteAccountNotes,
  listRemoteFollowing,
  setDomainBlocked,
  setRemoteFollow,
  type DomainBlock,
  type RemoteAccount,
} from "@/modules/notes/api/notes";
import { MuteDialog } from "./mute-dialog";
import { NoteList } from "./note-list";

function failure(error: unknown): "disabled" | "missing" | "invalid" | "blocked" | "other" {
  const code = error instanceof ApiError ? error.detail.code : undefined;
  if (code === "FEDERATION_DISABLED") return "disabled";
  if (code === "REMOTE_DOMAIN_BLOCKED") return "blocked";
  if (code === "REMOTE_ACCOUNT_NOT_FOUND") return "missing";
  if (code === "REMOTE_ACCOUNT_INVALID") return "invalid";
  return "other";
}

/** Follow an account elsewhere: a request until its server accepts, as on Mastodon. */
export function RemoteFollowButton({
  account,
  onChange,
  quiet = false,
}: {
  account: RemoteAccount;
  onChange: (next: RemoteAccount) => void;
  quiet?: boolean;
}) {
  const t = useTranslations("notes");
  const { authenticated } = useAuth();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const on = account.following || account.requested;

  async function toggle() {
    if (!authenticated) {
      askToSignIn("follow");
      return;
    }
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
        className={followToggleClass(on, true, quiet)}
      >
        {on && <Check className="mr-1 h-3.5 w-3.5" aria-hidden />}
        {account.following ? t("remoteFollowing") : account.requested ? t("remoteRequested") : t("remoteFollow")}
      </button>
      {confirmDialog}
    </>
  );
}

export function RemoteAccountRow({
  account,
  onChange,
  roomy = false,
}: {
  account: RemoteAccount;
  onChange: (next: RemoteAccount) => void;
  roomy?: boolean;
}) {
  const name = account.displayName || account.username || account.acct;
  return (
    <div
      data-testid={`remote-account-${account.acct}`}
      className={cn("flex gap-3", roomy ? "items-start py-3.5" : "items-center py-3")}
    >
      <BlogLink
        href={blogPath(`/remote/${account.id}`)}
        className={cn("focus-ring flex min-w-0 flex-1 gap-3 rounded-surface", roomy ? "items-start" : "items-center")}
      >
        <Avatar src={account.avatarUrl} name={account.username || account.acct} seed={null} size={roomy ? "lg" : "md"} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{name}</span>
          <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">@{account.acct}</span>
        </span>
      </BlogLink>
      {!hiddenFromViewer(account) && (
        <div className={roomy ? "pt-1.5" : undefined}>
          <RemoteFollowButton account={account} onChange={onChange} quiet={roomy} />
        </div>
      )}
    </div>
  );
}

const menuItem =
  "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
const dangerItem =
  "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10";

function useRemoteAccountSafety(account: RemoteAccount, onChange: (next: RemoteAccount) => void) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const name = account.acct;

  async function block() {
    const ok = await confirm({
      title: t("blockTitle", { username: name }),
      description: t("remoteBlockHint"),
      confirmLabel: t("block"),
      destructive: true,
    });
    if (!ok) return;
    try {
      onChange(await setRemoteBlocked(account.id, true));
      toast(t("remoteBlockedToast", { acct: name }));
    } catch {
      toast(t("blockFailed"), "error");
    }
  }

  async function unblock() {
    try {
      onChange(await setRemoteBlocked(account.id, false));
      toast(t("unblockedToast", { username: name }));
    } catch {
      toast(t("unblockFailed"), "error");
    }
  }

  async function mute(notifications: boolean, duration: number | null) {
    onChange(await muteRemote(account.id, notifications, duration));
  }

  async function unmute() {
    try {
      onChange(await unmuteRemote(account.id));
      toast(t("unmutedToast", { username: name }));
    } catch {
      toast(t("muteFailed"), "error");
    }
  }

  return { block, unblock, mute, unmute, confirm, confirmDialog };
}

/** ⋯ beside the follow button: mute or block the account, or block its whole server (Mastodon's domain block). */
function RemoteAccountMenu({
  account,
  onChange,
  onServerChange,
}: {
  account: RemoteAccount;
  onChange: (next: RemoteAccount) => void;
  onServerChange: () => void;
}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const safety = useRemoteAccountSafety(account, onChange);
  const [open, setOpen] = useState(false);
  const [muting, setMuting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const { domain } = account;
  const oneAccount = knowsRemoteSafety(account) && !account.domainBlocked;

  async function toggleServer() {
    setOpen(false);
    const on = !account.domainBlocked;
    if (on) {
      const ok = await safety.confirm({
        title: t("domainBlockConfirm", { domain }),
        description: t("domainBlockConfirmBody"),
        confirmLabel: t("domainBlockAction"),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await setDomainBlocked(domain, on);
      onServerChange();
      toast(on ? t("domainBlockedToast", { domain }) : t("domainUnblockedToast", { domain }));
    } catch {
      toast(t("domainBlockFailed"), "error");
    }
  }

  return (
    <div ref={root} className="sm:relative">
      <button
        type="button"
        aria-label={t("remoteMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring touch-target inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-11 z-20 w-56 max-w-full rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {oneAccount && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  if (account.muting) void safety.unmute();
                  else setMuting(true);
                }}
                className={menuItem}
              >
                {account.muting ? t("unmute") : t("muteMenu")}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void (account.blocking ? safety.unblock() : safety.block());
                }}
                className={account.blocking ? menuItem : dangerItem}
              >
                {account.blocking ? t("unblock") : t("blockMenu")}
              </button>
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={toggleServer}
            className={account.domainBlocked ? menuItem : dangerItem}
          >
            {account.domainBlocked ? t("domainUnblock", { domain }) : t("domainBlock", { domain })}
          </button>
        </div>
      )}
      <MuteDialog
        subject={account.acct}
        hint={t("remoteMuteHint", { acct: account.acct })}
        open={muting}
        onClose={() => setMuting(false)}
        mute={safety.mute}
      />
      {safety.confirmDialog}
    </div>
  );
}

function RemoteBlockedNotice({ account, onChange }: { account: RemoteAccount; onChange: (next: RemoteAccount) => void }) {
  const t = useTranslations("notes");
  const { unblock, confirmDialog } = useRemoteAccountSafety(account, onChange);
  return (
    <>
      <BlogEmpty
        title={t("remoteBlockedTitle")}
        action={
          <button
            type="button"
            onClick={() => void unblock()}
            className="focus-ring rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
          >
            {t("unblock")}
          </button>
        }
      />
      {confirmDialog}
    </>
  );
}

export function RemoteAccountScreen({ id }: { id: number }) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [account, setAccount] = useState<RemoteAccount | null>(null);
  const [failed, setFailed] = useState<"signin" | "missing" | null>(null);
  const [version, setVersion] = useState(0);
  const load = useCallback((page: number) => listRemoteAccountNotes(id, page), [id]);

  useEffect(() => {
    let alive = true;
    getRemoteAccount(id)
      .then((found) => alive && setAccount(found))
      .catch((error) => alive && setFailed(error instanceof ApiError && error.status === 401 ? "signin" : "missing"));
    return () => {
      alive = false;
    };
  }, [id, version]);

  if (failed === "signin") {
    return <SignInEmptyState page reason="remoteAccount" icon={Globe} />;
  }
  if (failed) {
    return <BlogEmpty title={t("remoteNotFound")} />;
  }
  if (!account) {
    return <div className="mt-10 h-24 animate-pulse rounded-surface bg-slate-100 dark:bg-slate-900" aria-hidden />;
  }
  const hidden = hiddenFromViewer(account);
  const caption = account.following
    ? t("remoteCaptionFollowing", { domain: account.domain })
    : account.requested
      ? t("remoteCaptionRequested", { domain: account.domain })
      : t("remoteCaption", { domain: account.domain });
  return (
    <div>
      <header className="flex items-start gap-4">
        <Avatar src={account.avatarUrl} name={account.username || account.acct} seed={null} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {account.displayName || account.username || account.acct}
          </h1>
          <p className="truncate text-[14px] text-slate-500 dark:text-slate-400">@{account.acct}</p>
          <div className="relative mt-3 flex flex-wrap items-center gap-3">
            {!hidden && <RemoteFollowButton account={account} onChange={setAccount} />}
            <RemoteAccountMenu
              account={account}
              onChange={setAccount}
              onServerChange={() => setVersion((v) => v + 1)}
            />
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
          {!hidden && <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">{caption}</p>}
        </div>
      </header>
      <div className="mt-6 border-t border-slate-200 dark:border-slate-800">
        {account.domainBlocked ? (
          <BlogEmpty
            title={t("domainBlockedTitle")}
            action={
              <button
                type="button"
                onClick={async () => {
                  try {
                    await setDomainBlocked(account.domain, false);
                    setVersion((v) => v + 1);
                    toast(t("domainUnblockedToast", { domain: account.domain }));
                  } catch {
                    toast(t("domainBlockFailed"), "error");
                  }
                }}
                className="focus-ring rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
              >
                {t("domainUnblock", { domain: account.domain })}
              </button>
            }
          />
        ) : account.blocking ? (
          <RemoteBlockedNotice account={account} onChange={setAccount} />
        ) : (
          <NoteList
            key={`${id}-${version}`}
            load={load}
            filterContext="account"
            empty={<BlogEmpty title={t("remoteNoNotes")} />}
          />
        )}
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
        <p className="rounded-surface border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("remoteFollowingEmpty")}
        </p>
      ) : (
        <div className="divide-y divide-slate-200 rounded-surface border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
          {accounts.map((account) => (
            <RemoteAccountRow
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

/** Blog settings: whole servers this member blocked, each with a way back. */
export function DomainBlockSettings() {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<DomainBlock[] | null>(null);

  useEffect(() => {
    let alive = true;
    listDomainBlocks()
      .then((found) => alive && setBlocks(found))
      .catch(() => alive && setBlocks([]));
    return () => {
      alive = false;
    };
  }, []);

  async function unblock(domain: string) {
    try {
      await setDomainBlocked(domain, false);
      setBlocks((current) => current?.filter((b) => b.domain !== domain) ?? null);
      toast(t("domainUnblockedToast", { domain }));
    } catch {
      toast(t("domainBlockFailed"), "error");
    }
  }

  if (blocks === null) return null;
  return (
    <section aria-labelledby="domain-blocks-title" className="mt-8">
      <h2 id="domain-blocks-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("domainBlocksTitle")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("domainBlocksHint")}</p>
      {blocks.length === 0 ? (
        <p className="rounded-surface border border-dashed border-slate-200 px-4 py-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("domainBlocksEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-surface border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
          {blocks.map((block) => (
            <li key={block.domain} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1 truncate text-[14px] text-slate-800 dark:text-slate-100">
                {block.domain}
              </span>
              <button
                type="button"
                onClick={() => void unblock(block.domain)}
                aria-label={t("domainUnblock", { domain: block.domain })}
                className="focus-ring rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
              >
                {t("domainUnblockShort")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
