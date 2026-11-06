"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/ui/use-confirm";
import { issueApiKey, listApiKeys, revokeApiKey } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { GROUPED_CELL, GroupedList } from "@/components/common/grouped-list";
import { BlockRow, ErrorRow, NoteRow } from "@/components/settings/settings-rows";
import type { ApiKeySummary, IssuedApiKey } from "@/types";
import { cn, formatDate } from "@/lib/utils";

export function ApiKeysSection() {
  const t = useTranslations("settings.apiKeys");
  const [confirm, confirmDialog] = useConfirm();
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listApiKeys()
      .then((items) => {
        if (!cancelled) setKeys(items);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retryLoad() {
    setLoadFailed(false);
    try {
      setKeys(await listApiKeys());
    } catch {
      setLoadFailed(true);
    }
  }

  async function refresh() {
    try {
      const items = await listApiKeys();
      setKeys(items);
    } catch {
      // soft fail; the section just shows stale data
    }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setIssuing(true);
    try {
      const result = await issueApiKey(name);
      setIssued(result);
      setRevealed(true);
      setCopied(false);
      setName("");
      await refresh();
    } catch (err) {
      toast(errorMessage(err, t("issueFailed")), "error");
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke(id: number) {
    const ok = await confirm({
      title: t("revokeConfirm"),
      description: t("revokeConfirmBody"),
      confirmLabel: t("revoke"),
      destructive: true,
    });
    if (!ok) return;
    setRevoking(id);
    try {
      await revokeApiKey(id);
      await refresh();
      toast(t("revoked"), "success");
    } catch (err) {
      toast(errorMessage(err, t("revokeFailed")), "error");
    } finally {
      setRevoking(null);
    }
  }

  async function handleCopy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(t("copyFailed"), "error");
    }
  }

  return (
    <>
      <GroupedList title={t("title")} footer={t("description")}>
        <form onSubmit={handleIssue} className="flex gap-2 px-4 py-3">
          <Input
            type="text"
            aria-label={t("nameLabel")}
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            disabled={issuing}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="outline" disabled={issuing} className="h-11">
            {issuing ? t("issuing") : t("issue")}
          </Button>
        </form>

        {issued && (
          <BlockRow>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-medium">{t("justIssuedTitle")}</p>
              <p className="mt-1">{t("justIssuedHint")}</p>
              <code data-sentry-mask className="mt-2 block min-w-0 break-all rounded-md bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                {revealed ? issued.rawKey : "•".repeat(issued.rawKey.length)}
              </code>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setRevealed((v) => !v)}>
                  {revealed ? t("hide") : t("reveal")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? t("copied") : t("copy")}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => setIssued(null)}>
                  {t("dismiss")}
                </Button>
              </div>
            </div>
          </BlockRow>
        )}

        {loadFailed ? (
          <ErrorRow message={t("loadError")} retryLabel={t("retry")} onRetry={() => void retryLoad()} />
        ) : keys === null ? (
          <NoteRow>{t("loading")}</NoteRow>
        ) : keys.length === 0 ? (
          <NoteRow>{t("empty")}</NoteRow>
        ) : (
          keys.map((key) => {
            const isActive = key.revokedAt === null;
            return (
              <div key={key.id} className={GROUPED_CELL}>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {key.name ?? <code className="font-mono text-[13px]">{key.prefix}…</code>}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {key.name && <code className="font-mono">{key.prefix}… · </code>}
                    {t("createdAt")} {formatDate(key.createdAt)} · {t("lastUsedAt")}{" "}
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : t("never")}
                  </p>
                </div>
                {isActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                  >
                    {revoking === key.id ? t("revoking") : t("revoke")}
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{t("revokedLabel")}</span>
                )}
              </div>
            );
          })
        )}

        <UsageSnippets />
      </GroupedList>
      {confirmDialog}
    </>
  );
}

/**
 * 키 발급이 끝이 아니라 시작이 되도록 — 이 키로 지금 당장 되는 일 3가지를 복붙 가능한 형태로.
 * 단축(in)·발행(automation)·백업(out)이 개방성 스토리의 전부라 셋만 싣는다. 접힌 채가 기본:
 * 키 관리하러 온 사람의 화면을 코드로 덮지 않는다.
 */
function UsageSnippets() {
  const t = useTranslations("settings.apiKeys");
  const base = `https://${process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me"}`;
  const groups: { title: string; snippets: { label: string; code: string; hint?: { text: string; href: string } }[] }[] = [
    {
      title: t("usageLinks"),
      snippets: [
        {
          label: t("usageShorten"),
          code: `curl -X POST ${base}/api/v1/links \\\n  -H "X-API-Key: kurl_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://example.com/very/long"}'`,
        },
      ],
    },
    {
      title: t("usageBlog"),
      snippets: [
        {
          label: t("usagePublish"),
          code: `export KURL_API_KEY=kurl_xxx\npython3 kurl-publish.py note.md --publish`,
          hint: {
            text: t("usageCliHint"),
            href: "https://github.com/haroya01/short-link/blob/main/tools/kurl-publish.py",
          },
        },
        {
          label: t("usageExport"),
          code: `curl -H "X-API-Key: kurl_xxx" -o kurl-export.zip \\\n  ${base}/api/v1/posts/export`,
        },
      ],
    },
  ];

  return (
    <details className="group/usage">
      <summary
        className={cn(
          "focus-ring cursor-pointer list-none rounded-b-2xl text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 group-open/usage:rounded-b-none dark:text-slate-100 dark:hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden",
          GROUPED_CELL,
        )}
      >
        {t("usageTitle")}
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-[var(--ease)] group-open/usage:rotate-90"
        />
      </summary>
      <div className="space-y-5 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        {groups.map((group) => (
          <div key={group.title} className="space-y-3">
            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{group.title}</p>
            {group.snippets.map((s) => (
              <div key={s.label} className="space-y-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                <pre className="overflow-x-auto rounded-md bg-slate-50 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {s.code}
                </pre>
                {s.hint && (
                  <a
                    href={s.hint.href}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-block rounded-sm text-[11px] text-slate-900 underline dark:text-slate-100"
                  >
                    {s.hint.text}
                  </a>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
