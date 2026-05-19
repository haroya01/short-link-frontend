"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Globe2,
  KeyRound,
  Sparkles,
  Webhook,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5500;

type FeatureKey = "realtime" | "abtest" | "insights" | "webhooks" | "safety" | "twofa";

type Feature = {
  key: FeatureKey;
  icon: React.ComponentType<{ className?: string }>;
  preview: React.ComponentType;
};

/**
 * 6-feature scrolling carousel for the home page "what you get" strip. Each preview is hand-
 * written to mirror the chrome of the corresponding real surface (border + bg + spacing scale +
 * status pill language) so the carousel reads as "a thumbnail of the real screen" rather than
 * "an unrelated marketing illustration".
 *
 * <p><b>Mirror sources</b>:
 *
 * <ul>
 *   <li>{@code RealtimePreview} → {@code live-click-feed.tsx} (eyebrow heading + pulsing dot +
 *       {@code divide-y rounded-xl} list, same row composition: time / country pill / device /
 *       channel)</li>
 *   <li>{@code AbTestPreview} → {@code link-destinations-section.tsx} ({@code rounded-md
 *       border} per-destination card, {@code w} weight pill, country code chip, brand-green
 *       progress bar)</li>
 *   <li>{@code InsightsPreview} → {@code weekly-insights-card.tsx} (eyebrow + delta badge +
 *       4-stat grid with {@code text-lg font-semibold tabular-nums} numbers)</li>
 *   <li>{@code WebhooksPreview} → {@code link-webhooks-section.tsx} (rounded card with
 *       monospace URL + status code pill + badge row mirroring {@code badgeSample / badgeBatch
 *       / badgeQuota} chips, plus the amber "issued secret" panel)</li>
 *   <li>{@code SafetyPreview} → admin / shorten error surfaces (red rounded card per
 *       {@code SafeBrowsing / PoW / datacenter ASN} reject row, mirroring the
 *       {@code shortenForm.errors.malicious} toast layout)</li>
 *   <li>{@code TwoFactorPreview} → {@code two-factor-section.tsx} (amber-bordered enrolment
 *       panel + QR placeholder + 6-digit input + recovery-codes grid)</li>
 * </ul>
 *
 * <p>The brand-green {@code accent-*} family is the only colored token in use; amber/red are
 * reserved for the "issued secret" / "danger" semantics that the real components also use, so
 * no off-brand color is introduced.
 */
const FEATURES: Feature[] = [
  { key: "realtime", icon: BarChart3, preview: RealtimePreview },
  { key: "abtest", icon: Globe2, preview: AbTestPreview },
  { key: "insights", icon: Sparkles, preview: InsightsPreview },
  { key: "webhooks", icon: Webhook, preview: WebhooksPreview },
  { key: "safety", icon: Shield, preview: SafetyPreview },
  { key: "twofa", icon: KeyRound, preview: TwoFactorPreview },
];

export function FeatureCarousel() {
  const t = useTranslations("home.features");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = FEATURES[active];
  const Preview = current.preview;
  const ActiveIcon = current.icon;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cn(
        "transition-all duration-700",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <div className="grid items-stretch gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-[1fr_1.6fr]">
        <div className="flex flex-col bg-white">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isActive = i === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setActive(i);
                  setPaused(true);
                }}
                className={cn(
                  "relative flex items-start gap-3 border-b border-slate-100 px-4 text-left transition-all last:border-b-0",
                  isActive ? "bg-accent-50/60 py-3" : "py-2.5 hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-0.5 transition-all duration-300",
                    isActive ? "bg-accent-600" : "bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors",
                    isActive ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      "text-[13px] font-semibold leading-tight transition-colors",
                      isActive ? "text-accent-800" : "text-slate-900",
                    )}
                  >
                    {t(`${f.key}.title`)}
                  </h3>
                  {isActive && (
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      {t(`${f.key}.desc`)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <div className="flex gap-1.5">
              {FEATURES.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === active ? "w-6 bg-accent-600" : "w-1.5 bg-slate-300",
                  )}
                />
              ))}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {String(active + 1).padStart(2, "0")} / 0{FEATURES.length}
            </p>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden bg-white">
          <div key={active} className="absolute inset-0 flex animate-fade-in flex-col p-6">
            <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
              <ActiveIcon className="h-3.5 w-3.5 text-accent-600" />
              <span className="font-mono uppercase tracking-wider">
                {t(`${current.key}.title`)}
              </span>
            </div>
            <div className="flex-1">
              <Preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------
 * Per-feature previews. Each mirrors the chrome of the corresponding real surface so the
 * carousel reads as a "thumbnail of the dashboard" rather than a separate marketing illustration.
 * ------------------------------------------------------------------------------------------ */

/**
 * Mirror of {@code live-click-feed.tsx} — same eyebrow heading style, pulsing emerald dot, and
 * {@code divide-y rounded-xl} feed with {@code time / country pill / device / channel} row
 * composition. Mock data is a scripted ring of 5 international events; the chrome is
 * pixel-equivalent so the user recognises this screen when they reach the real stats page.
 */
function RealtimePreview() {
  const events = [
    { ts: "02:14:08", country: "KR", device: "mobile", channel: "instagram.com" },
    { ts: "02:14:11", country: "JP", device: "desktop", channel: "(direct)" },
    { ts: "02:14:13", country: "KR", device: "mobile", channel: "twitter.com" },
    { ts: "02:14:17", country: "US", device: "desktop", channel: "slack.com" },
    { ts: "02:14:21", country: "KR", device: "mobile", channel: "kakaotalk.com" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-700">
          실시간 클릭
        </h3>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            aria-hidden
          />
          <span className="font-medium text-emerald-700">라이브</span>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {events.map((e, i) => (
          <li
            key={e.ts}
            className="flex items-center gap-3 px-4 py-2.5 text-[12px]"
            style={{ animation: `tickIn 500ms ${i * 120}ms ease-out backwards` }}
          >
            <span className="font-mono tabular-nums text-slate-500">{e.ts}</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
              {e.country}
            </span>
            <span className="text-slate-600">{e.device}</span>
            <span className="truncate text-slate-500">· {e.channel}</span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        @keyframes tickIn {
          from {
            transform: translateX(-6px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mirror of {@code link-destinations-section.tsx} — three {@code rounded-md border} variant
 * rows with the live composition: label / {@code w 70} weight pill / country chip / hits +
 * percent in mono tabular-nums / accent progress bar / break-all destination URL underneath.
 */
function AbTestPreview() {
  type Variant = {
    label: string;
    url: string;
    country: { code: string; flag: string } | null;
    weight: number | null;
    hits: number;
    isControl?: boolean;
  };
  const variants: Variant[] = [
    {
      label: "variant-A",
      url: "https://example.com/landing/kr",
      country: { code: "KR", flag: "🇰🇷" },
      weight: 70,
      hits: 1247,
    },
    {
      label: "variant-B",
      url: "https://example.com/landing/jp",
      country: { code: "JP", flag: "🇯🇵" },
      weight: 30,
      hits: 312,
    },
    {
      label: "기본 (원본 URL)",
      url: "",
      country: null,
      weight: null,
      hits: 86,
      isControl: true,
    },
  ];
  const total = variants.reduce((s, v) => s + v.hits, 0);
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-slate-500">
        같은 단축 URL 의 클릭을 가중치 + 방문자 국가 매칭으로 분기. 매칭 안 되면 기본 도착지로 폴백.
      </p>
      <div className="space-y-2">
        {variants.map((v, i) => {
          const pct = total === 0 ? 0 : (v.hits / total) * 100;
          return (
            <div
              key={v.label}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
              style={{ animation: `rowIn 500ms ${i * 100}ms ease-out backwards` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{v.label}</span>
                {v.isControl && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                    control
                  </span>
                )}
                {v.weight != null && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                    w {v.weight}
                  </span>
                )}
                {v.country && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                    {v.country.flag} {v.country.code}
                  </span>
                )}
                <span className="ml-auto font-mono tabular-nums text-slate-700">
                  {v.hits.toLocaleString()} · {pct.toFixed(1)}%
                </span>
              </div>
              {v.url && (
                <code className="mt-1 block break-all font-mono text-[11px] text-slate-500">
                  {v.url}
                </code>
              )}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full bg-accent-600"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    animation: `growBar 700ms ${i * 100}ms ease-out backwards`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes growBar {
          from {
            width: 0;
          }
        }
        @keyframes rowIn {
          from {
            transform: translateY(4px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mirror of {@code weekly-insights-card.tsx} — same eyebrow + delta badge composition and 4-stat
 * grid using {@code text-lg font-semibold tabular-nums} numbers with {@code text-xs} labels +
 * {@code text-[11px]} sub-captions. The brand-green emerald delta pill is identical to the real
 * card's {@code DeltaBadge} for positive deltas.
 */
function InsightsPreview() {
  const stats = [
    { label: "사람 클릭", value: "1,422", sub: "전체 중 91%" },
    { label: "탑 링크", value: "/spring", sub: "638 · instagram", mono: true },
    { label: "피크", value: "수 21시", sub: "이 시간대 클릭 38%" },
    { label: "전주 대비", value: "1,142", sub: "지난주 사람 클릭" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">이번 주 인사이트</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          ↗ 24%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-200 bg-white p-3"
            style={{ animation: `popIn 500ms ${i * 80}ms ease-out backwards` }}
          >
            <p className="text-xs text-slate-500">{s.label}</p>
            <p
              className={cn(
                "mt-1 truncate text-lg font-semibold text-slate-900 tabular-nums",
                s.mono && "font-mono",
              )}
              title={s.value}
            >
              {s.value}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes popIn {
          from {
            transform: scale(0.96);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mirror of {@code link-webhooks-section.tsx} — registered-hook row chrome plus the amber
 * "issued secret" panel that appears once after registration. Badge composition (봇 제외 / 샘플
 * 30% / 배치 / 한도) matches the real {@code badgeSkipBots / badgeSample / badgeBatch /
 * badgeQuota} chip set; the green {@code 200} status pill mirrors {@code StatusPill}.
 */
function WebhooksPreview() {
  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">slack-#alerts</span>
          <code
            className="break-all font-mono text-[11px] text-slate-600"
            title="https://hooks.slack.com/services/..."
          >
            https://hooks.slack.com/services/T0…/B0…
          </code>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            200
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
            봇 제외
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
            샘플 30%
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
            배치
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
            한도 10000/일
          </span>
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
        <p className="font-medium">웹훅이 등록되었어요</p>
        <p className="mt-1">
          이 secret 은 한 번만 표시됩니다. 받은 쪽에서 X-Kurl-Signature(sha256=hex) 검증에 사용하세요.
        </p>
        <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900">
          whsec_a2f3b9e4c1d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4
        </code>
      </div>
    </div>
  );
}

/**
 * Mirror of the shorten-form error toast + admin abuse log style — green-pass / red-reject rows
 * showing the three real defense layers: Google Safe Browsing reject, anonymous proof-of-work
 * challenge, and the datacenter-ASN auto bot tag. The red rows use the same {@code border-red-200
 * bg-red-50 text-red-700} palette the real {@code shortenForm.errors.malicious} toast uses.
 */
function SafetyPreview() {
  const rows = [
    {
      ok: true,
      url: "https://safe.example.com/post",
      note: null,
      delay: 0,
    },
    {
      ok: false,
      url: "http://phish-bank-login.tk/...",
      note: "Safe Browsing",
      delay: 120,
    },
    {
      ok: false,
      url: "익명 단축 — proof-of-work 필요",
      note: "PoW",
      delay: 240,
    },
    {
      ok: true,
      url: "AS16509 datacenter 클릭",
      note: "bot=true",
      delay: 360,
      tone: "warn" as const,
    },
  ];
  return (
    <div className="space-y-2 text-xs">
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2",
            row.ok
              ? row.tone === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
          style={{ animation: `slideIn 500ms ${row.delay}ms ease-out backwards` }}
        >
          <span
            className={cn(
              "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white",
              row.ok
                ? row.tone === "warn"
                  ? "bg-amber-600"
                  : "bg-accent-600"
                : "bg-red-600",
            )}
          >
            {row.ok ? "✓" : "✕"}
          </span>
          <span className="truncate font-mono text-[11px]">{row.url}</span>
          {row.note && (
            <span
              className={cn(
                "ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
                row.ok
                  ? row.tone === "warn"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                  : "bg-red-100 text-red-700",
              )}
            >
              {row.note}
            </span>
          )}
        </div>
      ))}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(-8px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mirror of {@code two-factor-section.tsx} enrolment panel — amber-bordered box, QR placeholder
 * + secret code, 6-digit input row, and the {@code RecoveryCodesPanel} 2x5 grid that appears
 * once 2FA is confirmed.
 */
function TwoFactorPreview() {
  const recoveryCodes = [
    "5K7M-Q2X9",
    "P3R8-N4T6",
    "L9W1-V6B2",
    "H8Y4-D3C7",
    "F2J5-Z1M0",
    "G6S3-K8N4",
    "T9X1-B7P5",
    "C4D2-Q6H8",
    "R3W7-J9L0",
    "M5V8-X1F2",
  ];
  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p className="text-[11px] font-medium">인증 앱으로 QR 을 스캔하세요</p>
        <div className="flex items-start gap-3">
          <div
            className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded border border-amber-300 bg-white text-[8px] text-slate-300"
            style={{
              backgroundImage:
                "linear-gradient(45deg,#0f172a 25%,transparent 25%,transparent 75%,#0f172a 75%,#0f172a),linear-gradient(45deg,#0f172a 25%,transparent 25%,transparent 75%,#0f172a 75%,#0f172a)",
              backgroundSize: "6px 6px",
              backgroundPosition: "0 0,3px 3px",
            }}
            aria-hidden
          >
            <span className="rounded bg-white px-1">QR</span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px]">수동 키:</p>
            <code className="block break-all rounded bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900">
              JBSWY3DPEHPK3PXPJBSWY3DP
            </code>
            <div className="flex items-center gap-1.5">
              {[3, 9, 1, 4, 8, 2].map((d, i) => (
                <span
                  key={i}
                  className="grid h-7 w-7 place-items-center rounded-md border border-accent-200 bg-accent-50 font-mono text-sm font-semibold text-accent-700"
                  style={{ animation: `popIn 400ms ${i * 60}ms ease-out backwards` }}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p className="text-[11px] font-medium">복구 코드 10개 (BCrypt 해시 저장)</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {recoveryCodes.map((c) => (
            <code
              key={c}
              className="rounded bg-white px-1.5 py-1 text-center font-mono text-[10px] text-slate-900"
            >
              {c}
            </code>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes popIn {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
