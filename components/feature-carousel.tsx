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

function RealtimePreview() {
  const events = [
    { ts: "02:14:08", flag: "🇰🇷", channel: "instagram.com", device: "mobile" },
    { ts: "02:14:11", flag: "🇯🇵", channel: "(direct)", device: "desktop" },
    { ts: "02:14:13", flag: "🇰🇷", channel: "twitter.com", device: "mobile" },
    { ts: "02:14:17", flag: "🇺🇸", channel: "slack.com", device: "desktop" },
    { ts: "02:14:21", flag: "🇰🇷", channel: "kakaotalk.com", device: "mobile" },
  ];
  return (
    <div className="space-y-1.5">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-emerald-700">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium">SSE 연결됨 · 실시간</span>
      </div>
      {events.map((e, i) => (
        <div
          key={e.ts}
          className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px]"
          style={{ animation: `tickIn 500ms ${i * 120}ms ease-out backwards` }}
        >
          <span className="font-mono tabular-nums text-slate-500">{e.ts}</span>
          <span>{e.flag}</span>
          <span className="text-slate-700">{e.channel}</span>
          <span className="ml-auto rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            {e.device}
          </span>
        </div>
      ))}
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

function AbTestPreview() {
  const variants = [
    { label: "🇰🇷 KR variant", url: "/landing/kr", weight: 70, hits: 1247, color: "bg-accent-600" },
    { label: "🇯🇵 JP variant", url: "/landing/jp", weight: 30, hits: 312, color: "bg-blue-500" },
    { label: "🌐 default", url: "/landing/en", weight: 0, hits: 86, color: "bg-slate-400" },
  ];
  const total = variants.reduce((s, v) => s + v.hits, 0);
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">
        같은 단축 URL → 가중치 + 방문자 국가 매칭 → 다른 페이지로 라우팅
      </p>
      {variants.map((v, i) => {
        const pct = (v.hits / total) * 100;
        return (
          <div key={v.label} className="rounded-md border border-slate-200 bg-white p-2.5">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-medium text-slate-900">{v.label}</span>
              {v.weight > 0 && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  w {v.weight}
                </span>
              )}
              <span className="ml-auto font-mono tabular-nums text-slate-700">
                {v.hits.toLocaleString()} · {pct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-slate-100">
              <div
                className={cn("h-full", v.color)}
                style={{
                  width: `${pct}%`,
                  animation: `growBar 700ms ${i * 100}ms ease-out backwards`,
                }}
              />
            </div>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes growBar {
          from {
            width: 0;
          }
        }
      `}</style>
    </div>
  );
}

function InsightsPreview() {
  const cards = [
    { label: "피크 시간", value: "21시", sub: "이 시간대 클릭 38%" },
    { label: "재방문율", value: "23%", sub: "유니크 1,422명 중 327명" },
    { label: "Half-life", value: "3.2일", sub: "초기 50% 클릭 도달까지" },
    { label: "Velocity", value: "🔥 2.4×", sub: "최근 1h vs 24h 평균" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="rounded-md border border-slate-200 bg-white p-3"
          style={{ animation: `popIn 500ms ${i * 80}ms ease-out backwards` }}
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {c.label}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{c.value}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{c.sub}</p>
        </div>
      ))}
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

function WebhooksPreview() {
  return (
    <div className="space-y-2 font-mono text-[11px]">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
        <p className="text-slate-500">POST https://hooks.slack.com/...</p>
        <p className="mt-1 text-slate-700">X-Kurl-Signature: sha256=a2f3…</p>
        <p className="text-slate-700">X-Kurl-Event: click.batch</p>
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-[11px]">
        <p className="font-sans text-emerald-800">설정으로 비용 절감</p>
        <ul className="mt-1.5 space-y-0.5 text-emerald-700">
          <li>· 봇/프리뷰 클릭 자동 제외 (-50%)</li>
          <li>· 샘플링 1~100% (-90%)</li>
          <li>· 5초 배치 묶음 전송 (-98%)</li>
          <li>· 일일 quota + 5회 실패 자동 비활성화</li>
        </ul>
      </div>
    </div>
  );
}

function SafetyPreview() {
  return (
    <div className="space-y-2 font-mono text-[11px]">
      {[
        { url: "https://safe.example.com/page", ok: true, note: null, delay: 0 },
        { url: "http://phish-bank-login.tk/...", ok: false, note: "Safe Browsing", delay: 150 },
        {
          url: "anonymous shorten without proof-of-work",
          ok: false,
          note: "PoW required",
          delay: 300,
        },
        {
          url: "AS16509 (datacenter) click",
          ok: true,
          note: "auto bot=true",
          delay: 450,
        },
      ].map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
            row.ok
              ? "border-slate-200 bg-white text-slate-600"
              : "border-red-200 bg-red-50 text-red-700",
          )}
          style={{ animation: `slideIn 500ms ${row.delay}ms ease-out backwards` }}
        >
          <span
            className={cn(
              "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white",
              row.ok ? "bg-accent-600" : "bg-red-600",
            )}
          >
            {row.ok ? "✓" : "✕"}
          </span>
          <span className="truncate">{row.url}</span>
          {row.note && (
            <span
              className={cn(
                "ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                row.ok ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-700",
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

function TwoFactorPreview() {
  return (
    <div className="grid h-full grid-cols-[160px_1fr] gap-3 font-mono">
      <div className="rounded-md border border-slate-200 bg-white p-2">
        <div
          className="grid h-[140px] place-items-center bg-[length:8px_8px] text-[9px] text-slate-300"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#0f172a 25%,transparent 25%,transparent 75%,#0f172a 75%,#0f172a),linear-gradient(45deg,#0f172a 25%,transparent 25%,transparent 75%,#0f172a 75%,#0f172a)",
            backgroundPosition: "0 0,4px 4px",
            backgroundColor: "#fff",
          }}
        >
          QR
        </div>
        <p className="mt-1.5 text-center text-[9px] text-slate-500">otpauth://totp/kurl.me:…</p>
      </div>
      <div className="flex flex-col justify-center gap-2 text-[11px]">
        <p className="font-sans text-slate-500">인증 앱에 등록 → 6자리 입력</p>
        <div className="flex items-center gap-1.5">
          {[3, 9, 1, 4, 8, 2].map((d, i) => (
            <span
              key={i}
              className="grid h-7 w-7 place-items-center rounded-md border border-accent-200 bg-accent-50 text-sm font-semibold text-accent-700"
              style={{ animation: `popIn 400ms ${i * 60}ms ease-out backwards` }}
            >
              {d}
            </span>
          ))}
        </div>
        <p className="font-sans text-[10px] text-slate-500">
          + 1회용 복구 코드 10개 자동 발급 (BCrypt 해시 저장)
        </p>
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
