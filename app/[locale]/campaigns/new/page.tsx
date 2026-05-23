"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createCampaign } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { CampaignPostEndAction } from "@/types";

type StartMode = "now" | "schedule";

export default function NewCampaignPage() {
  const { authenticated, ready } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [startMode, setStartMode] = useState<StartMode>("now");
  const [startsAtLocal, setStartsAtLocal] = useState(toLocalInput(new Date()));
  const [endsAtLocal, setEndsAtLocal] = useState(toLocalInput(addDays(new Date(), 7)));
  const [defaultDestinationUrl, setDefaultDestinationUrl] = useState("");
  const [postEndAction, setPostEndAction] = useState<CampaignPostEndAction>("KEEP");
  const [postEndDestinationUrl, setPostEndDestinationUrl] = useState("");
  const [postEndMessage, setPostEndMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ready && !authenticated) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          로그인이 필요합니다
        </h1>
        <Link href="/login" className="mt-6 inline-block">
          <Button>로그인하러 가기</Button>
        </Link>
      </div>
    );
  }

  const redirectRequired = postEndAction === "REDIRECT";
  const canSubmit =
    name.trim().length > 0 &&
    (!redirectRequired || postEndDestinationUrl.trim().length > 0) &&
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
      toast("QR 캠페인이 만들어졌어요", "success");
      router.push(`/campaigns/${created.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "QR 캠페인 만들기 실패", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> QR 캠페인 목록
        </Link>
        <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          새 QR 캠페인
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          기간과 종료 정책을 정하면, 그 안에 배포 묶음을 만들 수 있어요.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <Field label="QR 캠페인 이름" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 신주쿠 봄 포스터 배포"
            maxLength={255}
            required
          />
        </Field>

        <Field
          label="시작 시점"
          hint="대부분 '지금 시작'. 발주·인쇄 일정에 맞춰 시작하려면 예약."
        >
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              active={startMode === "now"}
              onClick={() => setStartMode("now")}
              label="지금 시작"
            />
            <Segmented
              active={startMode === "schedule"}
              onClick={() => setStartMode("schedule")}
              label="시작 시간 예약"
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
        </Field>

        <Field label="종료 시점" required>
          <Input
            type="datetime-local"
            value={endsAtLocal}
            onChange={(e) => setEndsAtLocal(e.target.value)}
            required
          />
          <p className="mt-1.5 text-[12px] text-slate-500">
            종료 후 인쇄된 QR 의 동작은 아래 정책을 따릅니다.
          </p>
        </Field>

        <Field
          label="기본 도착 URL"
          hint="비워두면 각 묶음마다 URL 을 따로 지정해야 해요."
        >
          <Input
            type="url"
            value={defaultDestinationUrl}
            onChange={(e) => setDefaultDestinationUrl(e.target.value)}
            placeholder="https://example.com/landing"
          />
        </Field>

        <Field label="종료 후 동작" required>
          <div className="space-y-2">
            <PolicyOption
              active={postEndAction === "KEEP"}
              onClick={() => setPostEndAction("KEEP")}
              title="그대로 유지"
              body="종료 후에도 인쇄된 QR 이 원래 URL 로 계속 이동합니다."
            />
            <PolicyOption
              active={postEndAction === "EXPIRE"}
              onClick={() => setPostEndAction("EXPIRE")}
              title="만료 페이지로"
              body="QR 을 스캔하면 '이 QR 캠페인은 종료됐어요' 안내 페이지를 봅니다."
            />
            {postEndAction === "EXPIRE" && (
              <div className="ml-6 mt-2 space-y-1.5">
                <textarea
                  value={postEndMessage}
                  onChange={(e) => setPostEndMessage(e.target.value.slice(0, 500))}
                  placeholder={`예: 캠페인이 종료됐어요. 다음 이벤트는 12월에 만나요.\n문의 — @kurl_official`}
                  rows={3}
                  className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-100"
                />
                <p className="text-[12px] text-slate-500">
                  비워두면 기본 안내문이 표시됩니다. 줄바꿈은 그대로 보입니다 ·{" "}
                  <span className="tabular-nums">{postEndMessage.length}/500</span>
                </p>
              </div>
            )}
            <PolicyOption
              active={postEndAction === "REDIRECT"}
              onClick={() => setPostEndAction("REDIRECT")}
              title="다른 페이지로 자동 전환"
              body="후기 / 다음 QR 캠페인 / 대기자 등록 — 인쇄된 QR 을 죽이지 않고 살려서 씁니다."
            />
          </div>
          {redirectRequired && (
            <div className="mt-3">
              <Input
                type="url"
                value={postEndDestinationUrl}
                onChange={(e) => setPostEndDestinationUrl(e.target.value)}
                placeholder="https://example.com/after-event"
                required
              />
              <p className="mt-1.5 text-[12px] text-slate-500">
                자동 전환 대상 URL — QR 캠페인 종료 시점에 인쇄된 QR 들에 일괄 적용됩니다.
              </p>
            </div>
          )}
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Link href="/campaigns">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" variant="accent" disabled={!canSubmit}>
            {submitting ? "만드는 중..." : "QR 캠페인 만들기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-medium text-slate-900">
        {label}
        {required && <span className="ml-1 text-accent-700">*</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-slate-500">{hint}</p>}
    </div>
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
        "h-10 rounded-xl border text-[13px] font-medium transition-colors " +
        (active
          ? "border-accent-600 bg-accent-50 text-accent-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
      }
    >
      {label}
    </button>
  );
}

function PolicyOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-xl border px-4 py-3 text-left transition-colors " +
        (active
          ? "border-accent-600 bg-accent-50/40"
          : "border-slate-200 bg-white hover:bg-slate-50")
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            "grid h-4 w-4 place-items-center rounded-full border " +
            (active ? "border-accent-600 bg-accent-600" : "border-slate-300 bg-white")
          }
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-[13px] font-medium text-slate-900">{title}</span>
      </div>
      <p className="mt-1.5 pl-6 text-[12px] leading-snug text-slate-500">{body}</p>
    </button>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
