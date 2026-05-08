"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  ApiError,
  deleteMyAccount,
  exportMyDataUrl,
  getMe,
  updateMyTimezone,
} from "@/lib/api";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Me } from "@/types";

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Seoul",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, ready, signOut } = useAuth();
  const { toast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [tz, setTz] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.replace(`/${locale}/login`);
      return;
    }
    let cancelled = false;
    getMe()
      .then((data) => {
        if (!cancelled) {
          setMe(data);
          setTz(data.timezone ?? "UTC");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authenticated, ready, locale, router]);

  async function handleSaveTimezone() {
    setSaving(true);
    try {
      const updated = await updateMyTimezone(tz);
      setMe(updated);
      toast(t("saved"), "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await signOut();
      router.push(`/${locale}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("saveFailed"), "error");
      setDeleting(false);
    }
  }

  if (!me) {
    return <div className="container max-w-2xl py-16 text-sm text-slate-500">…</div>;
  }

  return (
    <div className="container max-w-2xl space-y-8 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>

      <Section title={t("profileTitle")}>
        <Row label={t("email")}>{me.email}</Row>
        <Row label={t("provider")}>{me.oauthProvider}</Row>
        <Row label={t("role")}>{me.role}</Row>
        <Row label={t("joinedAt")}>{me.createdAt?.slice(0, 10) ?? "—"}</Row>
      </Section>

      <Section title={t("preferencesTitle")}>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {t("timezoneLabel")}
            </span>
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              {COMMON_TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">{t("timezoneHint")}</p>
          </label>
          <Button onClick={handleSaveTimezone} disabled={saving} size="sm">
            {t("save")}
          </Button>
        </div>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {t("interfaceLanguage")}
          </span>
          <div className="flex gap-2">
            {routing.locales.map((l) => (
              <Link
                key={l}
                href={pathname}
                locale={l}
                className={
                  l === locale
                    ? "rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white"
                    : "rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                }
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-500">{t("languageHint")}</p>
        </div>
      </Section>

      <Section title={t("dataTitle")}>
        <p className="text-xs text-slate-500">{t("exportHint")}</p>
        <a
          href={exportMyDataUrl()}
          className="mt-2 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {t("exportButton")}
        </a>
      </Section>

      <Section title={t("dangerTitle")} variant="danger">
        <p className="text-xs text-slate-500">{t("deleteHint")}</p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-2"
          onClick={() => setConfirmOpen(true)}
        >
          {t("deleteButton")}
        </Button>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setConfirmText("");
        }}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        destructive
        confirmLabel={deleting ? t("deleting") : t("deleteOk")}
        confirmDisabled={confirmText !== "DELETE" || deleting}
        onConfirm={handleDelete}
      >
        <Input
          autoFocus
          placeholder={t("deleteConfirmPlaceholder")}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

function Section({
  title,
  children,
  variant,
}: {
  title: string;
  children: React.ReactNode;
  variant?: "danger";
}) {
  return (
    <section
      className={
        "rounded-lg border bg-white p-5 " +
        (variant === "danger" ? "border-red-200" : "border-slate-200")
      }
    >
      <h2
        className={
          "text-sm font-semibold tracking-tight " +
          (variant === "danger" ? "text-red-700" : "text-slate-900")
        }
      >
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-900">{children}</span>
    </div>
  );
}
