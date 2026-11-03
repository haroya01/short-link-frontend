"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { deleteMyAccount, downloadMyData, updateMyTimezone } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { usePathname, useRouter as useLocaleRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { TwoFactorSection } from "@/components/settings/two-factor-section";
import { CustomDomainsSection } from "@/components/settings/custom-domains-section";
import { GROUPED_ROW, GroupedList } from "@/components/common/grouped-list";
import { ActionRow, SelectRow, ValueRow } from "@/components/settings/settings-rows";
import type { Me } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { LinksPage } from "@/components/links/links-page";

function localeName(l: string): string {
  try {
    return new Intl.DisplayNames([l], { type: "language" }).of(l) ?? l.toUpperCase();
  } catch {
    return l.toUpperCase();
  }
}

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

function timezoneOptions(current: string): string[] {
  let all: string[] = COMMON_TIMEZONES;
  try {
    all = Intl.supportedValuesOf("timeZone");
  } catch {
    // Older engines: the short list still covers the common cases.
  }
  return Array.from(new Set(["UTC", current, ...all]));
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const localeRouter = useLocaleRouter();
  const { authenticated, ready, me: ctxMe, signOut } = useAuth();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  // AuthProvider 가 이미 들고 있는 me 를 사용. 이전엔 page useEffect 에서 getMe() 한 번 더
  // 쳐서 /users/me 가 중복으로 호출됐음. timezone 업데이트 후 로컬 me 유지를 위해 setMe 는 남김.
  const [me, setMe] = useState<Me | null>(ctxMe);
  const [tz, setTz] = useState(ctxMe?.timezone ?? "UTC");
  const zones = useMemo(() => timezoneOptions(tz), [tz]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (ctxMe) {
      setMe(ctxMe);
      setTz(ctxMe.timezone ?? "UTC");
    }
  }, [ctxMe]);

  async function changeTimezone(next: string) {
    const previous = tz;
    setTz(next);
    try {
      const updated = await updateMyTimezone(next);
      setMe(updated);
      toast(t("saved"), "success");
    } catch (err) {
      setTz(previous);
      toast(errorMessage(err, t("saveFailed")), "error");
    }
  }

  function changeLocale(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
    localeRouter.replace(pathname, { locale: next as never });
  }

  async function handleExport() {
    try {
      await downloadMyData();
    } catch (err) {
      toast(errorMessage(err, t("exportFailed")), "error");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await signOut();
      router.push(`/${locale}`);
    } catch (err) {
      toast(errorMessage(err, t("saveFailed")), "error");
      setDeleting(false);
    }
  }

  if (ready && !authenticated) return <SignInEmptyState page reason="settings" />;

  if (!me) {
    return (
      <LinksPage width="form" aria-busy className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </LinksPage>
    );
  }

  return (
    <LinksPage width="form" className="space-y-6">
      <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
        {t("title")}
      </h1>

      <SettingsTabs t={t}>
        {(tab) => (
          <div className="space-y-8">
            {tab === "account" && (
              <>
                <GroupedList title={t("profileTitle")}>
                  <ValueRow label={t("email")}>{me.email}</ValueRow>
                  {me.role === "ADMIN" && <ValueRow label={t("role")}>{me.role}</ValueRow>}
                  <ValueRow label={t("joinedAt")}>{me.createdAt ? formatDate(me.createdAt) : "—"}</ValueRow>
                </GroupedList>

                <GroupedList title={t("preferencesTitle")} footer={t("timezoneHint")}>
                  <SelectRow
                    label={t("timezoneLabel")}
                    value={tz}
                    options={zones.map((z) => ({ value: z, label: z }))}
                    onChange={(next) => void changeTimezone(next)}
                  />
                  <SelectRow
                    label={t("interfaceLanguage")}
                    value={locale}
                    options={routing.locales.map((l) => ({ value: l, label: localeName(l), lang: l }))}
                    onChange={changeLocale}
                  />
                  <ThemeToggle
                    bare
                    className={cn(GROUPED_ROW, "w-full text-sm font-medium text-slate-900 dark:text-slate-100")}
                  />
                </GroupedList>
              </>
            )}

            {tab === "security" && (
              <>
                <TwoFactorSection />
                <ApiKeysSection />
              </>
            )}

            {tab === "domains" && <CustomDomainsSection />}

            {tab === "data" && (
              <>
                <GroupedList title={t("dataTitle")} footer={t("exportHint")}>
                  <ActionRow onClick={() => void handleExport()}>{t("exportButton")}</ActionRow>
                </GroupedList>

                <GroupedList footer={t("deleteHint")}>
                  <ActionRow danger onClick={() => setConfirmOpen(true)}>
                    {t("deleteButton")}
                  </ActionRow>
                </GroupedList>
              </>
            )}
          </div>
        )}
      </SettingsTabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) setConfirmText("");
        }}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        destructive
        compact
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
    </LinksPage>
  );
}

type SettingsTab = "account" | "security" | "domains" | "data";

function SettingsTabs({
  t,
  children,
}: {
  t: ReturnType<typeof useTranslations<"settings">>;
  children: (tab: SettingsTab) => React.ReactNode;
}) {
  const [tab, setTab] = useState<SettingsTab>(() => initialSettingsTab());

  useEffect(() => {
    const onHash = () => setTab(initialSettingsTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectTab(next: SettingsTab) {
    setTab(next);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${next}`);
    }
  }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "account", label: t("tabs.account") },
    { key: "security", label: t("tabs.security") },
    { key: "domains", label: t("tabs.domains") },
    { key: "data", label: t("tabs.data") },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div
          role="tablist"
          aria-label={t("tabs.aria")}
          className="flex max-w-full gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((it) => {
            const active = tab === it.key;
            return (
              <button
                key={it.key}
                id={`settings-tab-${it.key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="settings-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(it.key)}
                onKeyDown={(e) => {
                  const i = tabs.findIndex((x) => x.key === it.key);
                  const next =
                    e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length]
                    : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length]
                    : e.key === "Home" ? tabs[0]
                    : e.key === "End" ? tabs[tabs.length - 1]
                    : null;
                  if (!next) return;
                  e.preventDefault();
                  document.getElementById(`settings-tab-${next.key}`)?.focus();
                }}
                className={
                  "focus-ring -mb-px min-h-10 shrink-0 whitespace-nowrap border-b-2 px-3.5 text-sm font-medium transition-colors " +
                  (active
                    ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")
                }
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>
      <div id="settings-panel" role="tabpanel" tabIndex={0} aria-labelledby={`settings-tab-${tab}`} className="focus-ring rounded-2xl">
        {children(tab)}
      </div>
    </div>
  );
}

function initialSettingsTab(): SettingsTab {
  if (typeof window === "undefined") return "account";
  const h = window.location.hash.replace("#", "");
  if (h === "security" || h === "domains" || h === "data") return h;
  return "account";
}
