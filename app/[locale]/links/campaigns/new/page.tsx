"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import { createCampaign } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { SignInEmptyState } from "@/components/auth/sign-in-empty-state";
import type { CampaignPostEndAction } from "@/types";
import { CampaignField, PostEndFields, toLocalInput } from "@/components/links/campaigns/campaign-fields";
import { LinksPage } from "@/components/links/links-page";

type StartMode = "now" | "schedule";

export default function NewCampaignPage() {
  const { authenticated, ready } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const t = useTranslations("campaignApp.new");
  const tErr = useTranslations("errors");
  const [confirm, confirmDialog] = useConfirm();

  const [name, setName] = useState("");
  const [startMode, setStartMode] = useState<StartMode>("now");
  const [startsAtLocal, setStartsAtLocal] = useState(toLocalInput(new Date()));
  const [endsAtLocal, setEndsAtLocal] = useState(toLocalInput(addDays(new Date(), 7)));
  const [defaultDestinationUrl, setDefaultDestinationUrl] = useState("");
  const [postEndAction, setPostEndAction] = useState<CampaignPostEndAction>("KEEP");
  const [postEndDestinationUrl, setPostEndDestinationUrl] = useState("");
  const [postEndMessage, setPostEndMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 채워둔 이름·메시지·URL 은 전부 로컬 상태라 이 화면을 벗어나면 무경고로 사라진다. 날짜는
  // 기본값이 있으니 텍스트 입력·비기본 선택만 dirty 로 본다.
  const dirty =
    name.trim().length > 0 ||
    defaultDestinationUrl.trim().length > 0 ||
    postEndDestinationUrl.trim().length > 0 ||
    postEndMessage.trim().length > 0 ||
    startMode !== "now" ||
    postEndAction !== "KEEP";

  // 새로고침·탭 닫기·브라우저 뒤로가기(하드 내비)에서 입력값을 지키는 브라우저 확인창.
  useEffect(() => {
    if (!dirty || submitting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitting]);

  if (ready && !authenticated) {
    return (
      <SignInEmptyState page reason="campaigns" />
    );
  }

  const redirectRequired = postEndAction === "REDIRECT";
  const periodStart = startMode === "schedule" ? new Date(startsAtLocal) : new Date();
  const periodInvalid = !endsAtLocal || new Date(endsAtLocal).getTime() <= periodStart.getTime();
  const canSubmit =
    name.trim().length > 0 &&
    (!redirectRequired || postEndDestinationUrl.trim().length > 0) &&
    !periodInvalid &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createCampaign({
        name: name.trim(),
        startsAt: startMode === "schedule" ? new Date(startsAtLocal).toISOString() : undefined,
        endsAt: new Date(endsAtLocal).toISOString(),
        defaultDestinationUrl: defaultDestinationUrl.trim() || undefined,
        postEndAction,
        postEndDestinationUrl: redirectRequired ? postEndDestinationUrl.trim() : undefined,
        postEndMessage:
          postEndAction === "EXPIRE" && postEndMessage.trim().length > 0
            ? postEndMessage.trim()
            : undefined,
      });
      toast(t("created"), "success");
      router.push(`/campaigns/${created.id}`);
    } catch (err) {
      toast(errorMessage(err, t("createFailed")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  // 목록으로 나가는 소프트 내비는 beforeunload 가 안 걸리므로 dirty 면 여기서 한 번 확인한다.
  async function confirmLeave(e: React.MouseEvent) {
    if (!dirty || submitting) return;
    e.preventDefault();
    if (await confirm({ title: t("leaveConfirm") })) router.push("/campaigns");
  }

  return (
    <LinksPage width="form" className="space-y-6">
      <div>
        <Link
          href="/campaigns"
          onClick={confirmLeave}
          className="touch-target focus-ring inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("backToList")}
        </Link>
        <h1 className="mt-2 text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("intro")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
      >
        <CampaignField label={t("nameLabel")} required htmlFor="campaign-name">
          <Input
            id="campaign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={255}
            required
          />
        </CampaignField>

        <CampaignField
          label={t("startLabel")}
          hint={t("startHint")}
        >
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              active={startMode === "now"}
              onClick={() => setStartMode("now")}
              label={t("startNow")}
            />
            <Segmented
              active={startMode === "schedule"}
              onClick={() => setStartMode("schedule")}
              label={t("startSchedule")}
            />
          </div>
          {startMode === "schedule" && (
            <Input
              type="datetime-local"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
              className="mt-2"
            />
          )}
        </CampaignField>

        <CampaignField label={t("endLabel")} required htmlFor="campaign-end">
          <Input
            id="campaign-end"
            type="datetime-local"
            value={endsAtLocal}
            min={startMode === "schedule" ? startsAtLocal : toLocalInput(new Date())}
            onChange={(e) => setEndsAtLocal(e.target.value)}
            aria-invalid={periodInvalid || undefined}
            aria-describedby={periodInvalid ? "campaign-end-error" : undefined}
            required
          />
          {periodInvalid && (
            <p id="campaign-end-error" className="text-[12px] text-red-600 dark:text-red-400">
              {tErr("INVALID_CAMPAIGN_PERIOD")}
            </p>
          )}
        </CampaignField>

        <CampaignField
          label={t("defaultUrlLabel")}
          hint={t("defaultUrlHint")}
          htmlFor="campaign-default-url"
        >
          <Input
            id="campaign-default-url"
            type="url"
            value={defaultDestinationUrl}
            onChange={(e) => setDefaultDestinationUrl(e.target.value)}
            placeholder="https://example.com/landing"
          />
        </CampaignField>

        <PostEndFields
          action={postEndAction}
          onAction={setPostEndAction}
          message={postEndMessage}
          onMessage={setPostEndMessage}
          redirectUrl={postEndDestinationUrl}
          onRedirectUrl={setPostEndDestinationUrl}
        />

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
          <Link href="/campaigns" onClick={confirmLeave} className={buttonVariants({ variant: "outline" })}>
            {t("cancel")}
          </Link>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? t("creating") : t("submit")}
          </Button>
        </div>
      </form>
      {confirmDialog}
    </LinksPage>
  );
}

function Segmented({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-10 rounded-lg border text-[13px] font-medium transition-colors " +
        (active
          ? "border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50")
      }
    >
      {label}
    </button>
  );
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
