"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Globe2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ROTATE_MS = 4000;

type Feature = {
  key: "realtime" | "geo" | "safety";
  icon: React.ComponentType<{ className?: string }>;
  preview: React.ComponentType;
};

const FEATURES: Feature[] = [
  { key: "realtime", icon: BarChart3, preview: RealtimePreview },
  { key: "geo", icon: Globe2, preview: GeoPreview },
  { key: "safety", icon: Shield, preview: SafetyPreview },
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
      <div className="grid items-stretch gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-[1fr_1.4fr]">
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
                  "relative flex items-start gap-3 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0",
                  isActive ? "bg-accent-50/60" : "hover:bg-slate-50",
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
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors",
                    isActive ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isActive ? "text-accent-800" : "text-slate-900",
                    )}
                  >
                    {t(`${f.key}.title`)}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {t(`${f.key}.desc`)}
                  </p>
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

        <div className="relative min-h-[280px] overflow-hidden bg-white">
          <div
            key={active}
            className="absolute inset-0 flex animate-fade-in flex-col p-6"
          >
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
  const bars = [22, 45, 38, 60, 55, 72, 88, 80, 95, 78, 84, 92];
  return (
    <div className="flex h-full items-end gap-1.5">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-accent-500/80"
          style={{
            height: `${h}%`,
            animation: `riseBar 600ms ${i * 60}ms ease-out backwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes riseBar {
          from {
            transform: scaleY(0);
            transform-origin: bottom;
          }
          to {
            transform: scaleY(1);
            transform-origin: bottom;
          }
        }
      `}</style>
    </div>
  );
}

function GeoPreview() {
  const items = [
    { label: "🇰🇷 KR", pct: 64 },
    { label: "🇯🇵 JP", pct: 18 },
    { label: "🇺🇸 US", pct: 11 },
    { label: "🇩🇪 DE", pct: 4 },
    { label: "🌐 etc", pct: 3 },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-slate-700">{it.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-accent-600"
              style={{
                width: `${it.pct}%`,
                animation: `growBar 700ms ${i * 80}ms ease-out backwards`,
              }}
            />
          </div>
          <span className="w-10 text-right font-mono text-[11px] tabular-nums text-slate-500">
            {it.pct}%
          </span>
        </div>
      ))}
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

function SafetyPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 font-mono text-xs">
      {[
        { url: "https://safe.example.com/page", ok: true, delay: 0 },
        { url: "https://promo.shop/spring-sale", ok: true, delay: 200 },
        { url: "http://phish-bank-login.tk/...", ok: false, delay: 400 },
        { url: "https://docs.partner.io/intro", ok: true, delay: 600 },
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
          {!row.ok && (
            <span className="ml-auto rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              blocked
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
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
