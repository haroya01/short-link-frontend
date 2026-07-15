"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { issueApiKey, listApiKeys, revokeApiKey } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { ApiKeySummary, IssuedApiKey } from "@/types";

export function ApiKeysSection() {
  const t = useTranslations("settings.apiKeys");
  const errorMessage = useApiErrorMessage();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
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
        if (!cancelled) setKeys([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!confirm(t("revokeConfirm"))) return;
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
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>

      <form onSubmit={handleIssue} className="flex gap-2">
        <Input
          type="text"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          disabled={issuing}
          className="flex-1"
        />
        <Button type="submit" size="sm" variant="accent" disabled={issuing}>
          {issuing ? t("issuing") : t("issue")}
        </Button>
      </form>

      {issued && (
        <div className="rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900">
          <p className="font-medium">{t("justIssuedTitle")}</p>
          <p className="mt-1">{t("justIssuedHint")}</p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:text-slate-100">
              {revealed ? issued.rawKey : "•".repeat(issued.rawKey.length)}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? t("hide") : t("reveal")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 text-amber-700 dark:text-amber-400 underline hover:text-amber-900"
            onClick={() => setIssued(null)}
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      {keys === null ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {keys.map((key) => {
            const isActive = key.revokedAt === null;
            return (
              <li
                key={key.id}
                className={
                  "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs " +
                  (isActive ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400")
                }
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{key.prefix}…</code>
                    {key.name && (
                      <span className="font-medium text-slate-900 dark:text-slate-100">{key.name}</span>
                    )}
                    {!isActive && (
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
                        {t("revokedLabel")}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("createdAt")}: {key.createdAt.slice(0, 10)} ·{" "}
                    {t("lastUsedAt")}: {key.lastUsedAt ? key.lastUsedAt.slice(0, 10) : t("never")}
                  </div>
                </div>
                {isActive && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revoking === key.id}
                  >
                    {revoking === key.id ? t("revoking") : t("revoke")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <UsageSnippets />
    </div>
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
  const snippets = [
    {
      label: t("usageShorten"),
      code: `curl -X POST ${base}/api/v1/links \\\n  -H "X-API-Key: kurl_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://example.com/very/long"}'`,
    },
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
  ];

  return (
    <details className="group rounded-md border border-slate-200 dark:border-slate-800">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-90" />
        {t("usageTitle")}
      </summary>
      <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 px-3 py-3">
        {snippets.map((s) => (
          <div key={s.label} className="space-y-1">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            <pre className="overflow-x-auto rounded bg-slate-50 dark:bg-slate-900 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200">
              {s.code}
            </pre>
            {s.hint && (
              <a
                href={s.hint.href}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-[11px] text-accent-700 dark:text-accent-400 underline hover:text-accent-800"
              >
                {s.hint.text}
              </a>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
