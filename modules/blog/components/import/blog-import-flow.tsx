"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { askToSignIn } from "@/components/auth/login-prompt";
import { useAuth } from "@/lib/auth";
import { blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import {
  createImportSource,
  getImportSource,
  previewImport,
  verifyImportSource,
  type ImportPreview,
  type ImportSource,
} from "@/modules/blog/api/imports";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { authorHref } from "@/modules/blog/lib/author-href";
import { importErrorKey, importStep, progressPercent, syncErrorKey, withQuery } from "@/modules/blog/lib/import-flow";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";

const POLL_MS = 2000;
const PREVIEW_ROWS = 6;

type View =
  | { step: "address" }
  | { step: "preview"; preview: ImportPreview; url: string }
  | { step: "verify" | "progress" | "done" | "error"; source: ImportSource };

const textLink =
  "focus-ring rounded text-[13px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400";

function bareUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function replaceQuery(key: string, value: string | null) {
  window.history.replaceState(null, "", withQuery(window.location.href, key, value));
}

export function BlogImportFlow() {
  const t = useTranslations("blogImport");
  const { toast } = useToast();
  const { ready, authenticated } = useAuth();
  const [url, setUrl] = useState("");
  const [view, setView] = useState<View>({ step: "address" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumed = useRef(false);

  const showSource = useCallback((source: ImportSource) => {
    setView({ step: importStep(source), source });
    replaceQuery("source", String(source.id));
  }, []);

  const runPreview = useCallback(
    async (target: string) => {
      setBusy(true);
      setError(null);
      try {
        const preview = await previewImport(target);
        setView({ step: "preview", preview, url: target });
        replaceQuery("url", target);
      } catch (e) {
        setError(t(importErrorKey(e)));
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!ready || resumed.current) return;
    resumed.current = true;
    const params = new URLSearchParams(window.location.search);
    const sourceId = Number(params.get("source"));
    const initialUrl = params.get("url");
    if (sourceId > 0 && authenticated) {
      getImportSource(sourceId)
        .then(showSource)
        .catch(() => replaceQuery("source", null));
    } else if (initialUrl) {
      setUrl(initialUrl);
      void runPreview(initialUrl);
    }
  }, [ready, authenticated, runPreview, showSource]);

  const pollingId = view.step === "progress" ? view.source.id : null;
  useEffect(() => {
    if (pollingId == null) return;
    let alive = true;
    const timer = window.setInterval(() => {
      getImportSource(pollingId)
        .then((source) => alive && showSource(source))
        .catch(() => undefined);
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [pollingId, showSource]);

  function submitAddress(e: FormEvent) {
    e.preventDefault();
    const target = url.trim();
    if (!target) {
      setError(t("emptyUrl"));
      return;
    }
    void runPreview(target);
  }

  async function startImport(target: string) {
    if (!authenticated) {
      askToSignIn("import", window.location.href);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      showSource(await createImportSource(target));
    } catch (e) {
      setError(t(importErrorKey(e)));
    } finally {
      setBusy(false);
    }
  }

  async function verify(source: ImportSource) {
    setBusy(true);
    setError(null);
    try {
      showSource(await verifyImportSource(source.id));
    } catch (e) {
      setError(t(importErrorKey(e)));
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setError(null);
    setView({ step: "address" });
    replaceQuery("url", null);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast(t("copied"));
    } catch {
      toast(t("copyFailed"), "error");
    }
  }

  const stepIndex = view.step === "address" || view.step === "preview" ? 0 : view.step === "verify" ? 1 : 2;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-14">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("title")}
      </h1>
      <ol aria-label={t("stepsLabel")} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        {[t("stepAddress"), t("stepVerify"), t("stepImport")].map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className="h-px w-5 bg-slate-200 dark:bg-slate-700" />}
            <span
              aria-current={i === stepIndex ? "step" : undefined}
              className={cn(
                "tabular-nums",
                i === stepIndex
                  ? "font-semibold text-slate-900 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div key={view.step} className="view-enter mt-6 border-t border-slate-100 pt-6 dark:border-slate-800 sm:mt-8 sm:pt-8">
        {view.step === "address" && (
          <form onSubmit={submitAddress} noValidate>
            <label htmlFor="import-url" className="block text-[13px] font-medium text-slate-700 dark:text-slate-200">
              {t("urlLabel")}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="import-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                spellCheck={false}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("urlPlaceholder")}
                aria-invalid={error ? true : undefined}
                aria-describedby="import-url-help"
              />
              <button
                type="submit"
                disabled={busy}
                className={cn(blogCta(), "h-11 shrink-0 justify-center disabled:opacity-60")}
              >
                {busy ? t("previewing") : t("preview")}
              </button>
            </div>
            <p id="import-url-help" className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
              {t("supported")}
            </p>
            <ErrorLine message={error} />
          </form>
        )}

        {view.step === "preview" && (
          <PreviewStep
            preview={view.preview}
            busy={busy}
            error={error}
            onImport={() => void startImport(view.url)}
            onStartOver={startOver}
          />
        )}

        {view.step === "verify" && (
          <section aria-labelledby="import-verify-title">
            <h2 id="import-verify-title" className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
              {t("verifyTitle")}
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">{t("verifyBody")}</p>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-surface border border-slate-200 py-3 pl-4 pr-3 dark:border-slate-800">
              <span className="min-w-0">
                <span className="block text-[12px] text-slate-500 dark:text-slate-400">{t("codeLabel")}</span>
                <code data-testid="import-code" className="block truncate font-mono text-[20px] font-semibold text-slate-900 dark:text-slate-100">
                  {view.source.verificationCode}
                </code>
              </span>
              {view.source.verificationCode && (
                <button
                  type="button"
                  onClick={() => void copyCode(view.source.verificationCode ?? "")}
                  className={cn(blogCta({ variant: "secondary" }), "shrink-0 py-2")}
                >
                  {t("copy")}
                </button>
              )}
            </div>
            <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
              {t(`where.${view.source.platform}`)}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void verify(view.source)}
                className={cn(blogCta(), "disabled:opacity-60")}
              >
                {busy ? t("verifying") : t("verify")}
              </button>
              <a href={view.source.blogUrl} target="_blank" rel="noopener noreferrer" className={textLink}>
                {t("openBlog")}
              </a>
            </div>
            <ErrorLine message={error} />
          </section>
        )}

        {view.step === "progress" && <ProgressStep source={view.source} />}

        {view.step === "done" && <DoneStep source={view.source} />}

        {view.step === "error" && (
          <section aria-labelledby="import-error-title">
            <h2 id="import-error-title" className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
              {t("errorTitle")}
            </h2>
            <p className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-300">{t(syncErrorKey(view.source.lastError))}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <BlogLink href={`${blogPath("/settings")}#imports`} className={blogCta({ variant: "secondary" })}>
                {t("manage")}
              </BlogLink>
              <button type="button" onClick={startOver} className={textLink}>
                {t("otherAddress")}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 text-[13px] font-medium text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

function PreviewStep({
  preview,
  busy,
  error,
  onImport,
  onStartOver,
}: {
  preview: ImportPreview;
  busy: boolean;
  error: string | null;
  onImport: () => void;
  onStartOver: () => void;
}) {
  const t = useTranslations("blogImport");
  const ago = useCompactTime();
  const shown = preview.items.slice(0, PREVIEW_ROWS);
  const rest = preview.items.length - shown.length;
  return (
    <section aria-labelledby="import-preview-title">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          {t(`platform.${preview.platform}`)} · {t("postCount", { count: preview.items.length })}
        </p>
        <button type="button" onClick={onStartOver} className={cn(textLink, "shrink-0")}>
          {t("otherAddress")}
        </button>
      </div>
      <h2
        id="import-preview-title"
        className="mt-1 text-[22px] font-bold leading-tight tracking-headline text-slate-900 dark:text-slate-100"
      >
        {preview.blogTitle}
      </h2>
      <p className="mt-1 truncate text-[13px] text-slate-500 dark:text-slate-400">{bareUrl(preview.blogUrl)}</p>
      <p data-testid="import-content-kind" className="mt-4 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
        {preview.fullContent ? t("fullContent") : t("excerptOnly")} {t("syncNote")}
      </p>

      <ul className="mt-5 border-t border-slate-100 dark:border-slate-800" data-testid="import-preview-list">
        {shown.map((item) => (
          <li key={item.url} className="flex gap-3 border-b border-slate-100 py-3 dark:border-slate-800">
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
                {item.title}
              </span>
              {item.publishedAt && (
                <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">{ago(item.publishedAt)}</span>
              )}
            </span>
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="img-fade h-14 w-14 shrink-0 rounded-inner bg-slate-100 object-cover dark:bg-slate-800"
              />
            )}
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">{t("more", { count: rest })}</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onImport}
        className={cn(blogCta(), "mt-6 disabled:opacity-60")}
      >
        {busy ? t("creating") : t("import")}
      </button>
      <ErrorLine message={error} />
    </section>
  );
}

function ProgressStep({ source }: { source: ImportSource }) {
  const t = useTranslations("blogImport");
  const progress = source.progress ?? { total: 0, done: 0, failed: 0 };
  const percent = progressPercent(source.progress);
  return (
    <section aria-labelledby="import-progress-title">
      <h2 id="import-progress-title" className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
        {t("progressTitle")}
      </h2>
      <div
        role="progressbar"
        aria-labelledby="import-progress-title"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        className="mt-5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-accent-600 transition-[width] duration-300 ease-[var(--ease)] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p aria-live="polite" className="mt-2 flex flex-wrap justify-between gap-x-4 text-[13px] tabular-nums text-slate-600 dark:text-slate-300">
        <span data-testid="import-progress-count">{t("progressCount", { done: progress.done, total: progress.total })}</span>
        {progress.failed > 0 && <span>{t("progressFailed", { count: progress.failed })}</span>}
      </p>
      <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">{t("progressNote")}</p>
    </section>
  );
}

function DoneStep({ source }: { source: ImportSource }) {
  const t = useTranslations("blogImport");
  const locale = useLocale();
  const { me } = useAuth();
  const failed = source.progress?.failed ?? 0;
  return (
    <section aria-labelledby="import-done-title">
      <h2
        id="import-done-title"
        className="text-[22px] font-bold leading-tight tracking-headline text-slate-900 dark:text-slate-100"
      >
        {t("doneTitle", { count: source.importedCount })}
      </h2>
      {failed > 0 && (
        <p className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-300">{t("progressFailed", { count: failed })}</p>
      )}
      {source.announceNewPosts && (
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">{t("doneAnnounce")}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        {me?.username && (
          <a href={authorHref(me.username, locale)} className={blogCta()}>
            {t("toMyBlog")}
          </a>
        )}
        <BlogLink href={`${blogPath("/settings")}#imports`} className={textLink}>
          {t("manage")}
        </BlogLink>
      </div>
    </section>
  );
}
