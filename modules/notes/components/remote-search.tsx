"use client";

import { useId, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { askToSignIn } from "@/components/auth/login-prompt";
import { useAuth } from "@/lib/auth";
import {
  remoteSearchQuery,
  resolveRemote,
  searchRemoteAccounts,
  type RemoteResolution,
} from "@/modules/notes/api/federation-search";
import type { Note, RemoteAccount } from "@/modules/notes/api/notes";
import { hiddenFromViewer } from "@/modules/notes/api/remote-safety";
import { remoteQueryDomain } from "@/modules/notes/lib/remote-handle";
import { NoteCard } from "./note-card";
import { RemoteAccountRow } from "./remote-account";

function KnownAccount({ initial, roomy = false }: { initial: RemoteAccount; roomy?: boolean }) {
  const [account, setAccount] = useState(initial);
  return <RemoteAccountRow account={account} onChange={setAccount} roomy={roomy} />;
}

function ResolvedNote({ initial }: { initial: Note }) {
  const [note, setNote] = useState(initial);
  return (
    <div className="pb-2">
      <NoteCard note={note} onChange={setNote} />
    </div>
  );
}

function useRemoteResolution(query: string): RemoteResolution | null {
  const { authenticated, ready } = useAuth();
  const { data } = useQuery({
    queryKey: ["remote", "resolve", query.trim()],
    queryFn: () => resolveRemote(query),
    enabled: ready && authenticated,
    staleTime: 60_000,
  });
  return ready && !authenticated ? { state: "signin" } : (data ?? null);
}

export function RemoteSearchFallback({ query, children }: { query: string; children: ReactNode }) {
  return useRemoteResolution(query)?.state === "hidden" ? <>{children}</> : null;
}

export function RemoteSearchResult({ query }: { query: string }) {
  const t = useTranslations("notes");
  const tPrompt = useTranslations("loginPrompt");
  const headingId = useId();
  const result = useRemoteResolution(query);
  if (result?.state === "hidden") return null;

  return (
    <section
      aria-labelledby={headingId}
      data-testid="remote-search-result"
      className="mb-6 border-b border-slate-200 dark:border-slate-800"
    >
      <h2 id={headingId} className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("remoteSection")}
      </h2>
      {result?.state === "account" ? (
        <KnownAccount key={result.account.id} initial={result.account} />
      ) : result?.state === "note" ? (
        <ResolvedNote key={result.note.id} initial={result.note} />
      ) : (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-4 text-[14px] text-slate-500 dark:text-slate-400">
          {result === null ? (
            t("remoteLookingUp")
          ) : result.state === "signin" ? (
            <>
              <span>{t("remoteSearchSignIn")}</span>
              <button
                type="button"
                onClick={() => askToSignIn("remote")}
                className="focus-ring rounded font-medium text-accent-700 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
              >
                {tPrompt("signIn")}
              </button>
            </>
          ) : result.state === "missing" ? (
            t("remoteSearchNotFound", { domain: result.domain })
          ) : (
            t("remoteSearchUnreachable", { domain: result.domain })
          )}
        </p>
      )}
    </section>
  );
}

export function useRemotePeople(query: string, enabled: boolean) {
  const wanted = enabled && remoteQueryDomain(query) === null;
  const { data, isLoading } = useQuery({
    queryKey: ["people", "remote", remoteSearchQuery(query)],
    queryFn: () => searchRemoteAccounts(query),
    enabled: wanted,
    staleTime: 30_000,
  });
  const accounts = wanted && data ? data.filter((account) => !hiddenFromViewer(account)) : null;
  return { accounts, loading: wanted && isLoading };
}

export function RemotePeople({ accounts }: { accounts: RemoteAccount[] }) {
  const t = useTranslations("notes");
  const headingId = useId();
  if (accounts.length === 0) {
    return (
      <p className="mt-6 border-t border-slate-100 pt-5 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {t("remoteSearchHint")}
      </p>
    );
  }
  return (
    <section
      aria-labelledby={headingId}
      className="mt-6 border-t border-slate-100 pt-5 first:mt-0 first:border-t-0 first:pt-0 dark:border-slate-800"
    >
      <h2 id={headingId} className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("remoteSection")}
      </h2>
      <ul data-testid="remote-people-results" className="divide-y divide-slate-100 dark:divide-slate-800">
        {accounts.map((account) => (
          <li key={account.id}>
            <KnownAccount initial={account} roomy />
          </li>
        ))}
      </ul>
    </section>
  );
}
