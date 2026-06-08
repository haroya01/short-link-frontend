"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { writeStorageString } from "@/lib/storage-json";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";
import { cn } from "@/lib/utils";

const LOGIN_NEXT_KEY = "kurl:login-next";

// Whitelist post-OAuth destinations so /login?next=evil.com cannot hijack the redirect.
const ALLOWED_NEXT_PATHS = new Set<string>([
  "/profile/auto",
  "/settings/profile",
  "/dashboard",
  "/settings",
  "/campaigns",
  "/campaigns/new",
]);

function sanitizeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  return ALLOWED_NEXT_PATHS.has(raw) ? raw : null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();

  // OAuth round-trip drops the query string, so stash `next` here for the callback to read.
  useEffect(() => {
    const next = sanitizeNext(searchParams.get("next"));
    if (next) writeStorageString(LOGIN_NEXT_KEY, next, { session: true });
  }, [searchParams]);

  return <LoginShell />;
}

function LoginShell() {
  const t = useTranslations("login");
  const { signInWithGoogle } = useAuth();
  return (
    <div className="flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center bg-white dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="hero-stagger flex flex-col items-center space-y-5 text-center">
          <h1
            className="flex items-center justify-center gap-3"
            style={{ ["--hi" as string]: 0 } as React.CSSProperties}
          >
            <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
            <span className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
              {t("title")}
            </span>
            <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
          </h1>

          <div
            className="relative mark-draw-in"
            style={{ ["--hi" as string]: 1 } as React.CSSProperties}
          >
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-full bg-accent-200/55 blur-3xl"
            />
            <BrandMark className="h-14 w-auto" />
          </div>

          <BrandRotator
            style={{ ["--hi" as string]: 2 } as React.CSSProperties}
          />

          <p
            className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400"
            style={{ ["--hi" as string]: 3 } as React.CSSProperties}
          >
            {t("subtitle")}
          </p>
        </div>

        <div
          className="profile-fade mt-10 px-4 sm:px-0"
          style={{ ["--idx" as string]: 4 } as React.CSSProperties}
        >
          <Button
            variant="outline"
            className="h-11 w-full justify-center rounded-xl"
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
        </div>

        <div
          className="profile-fade mt-8 text-center"
          style={{ ["--idx" as string]: 5 } as React.CSSProperties}
        >
          <Link
            href="/"
            className="text-[13px] text-slate-500 dark:text-slate-400 underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
          >
            {t("anonymousButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}

const ROTATION_HOLD_MS = 1500;

type Rotation = {
  lead: string;
  join: string;
  tail: string;
  end: string;
  verbs: string[];
};

type GsapApi = typeof import("gsap").default;
type SplitTextInstance = {
  chars: Element[];
  revert: () => void;
};
type SplitTextCtor = new (element: Element, vars: { type: string }) => SplitTextInstance;

function BrandRotator({ style }: { style?: React.CSSProperties }) {
  const t = useTranslations("login");
  const rotation = (() => {
    try {
      const raw = t.raw("rotation");
      if (
        raw &&
        typeof raw === "object" &&
        Array.isArray((raw as Rotation).verbs)
      ) {
        return raw as Rotation;
      }
      return null;
    } catch {
      return null;
    }
  })();
  const verbs = rotation?.verbs ?? [];

  const [idx, setIdx] = useState<number>(0);
  const [mode, setMode] = useState<"cycling" | "settled">("cycling");
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (verbs.length === 0) {
      setMode("settled");
      return;
    }
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      // a11y — motion off 사용자는 즉시 settled, flash 없도록 transition 잠깐 끔.
      const root = containerRef.current;
      root?.classList.add("brand-no-transition");
      setMode("settled");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root?.classList.remove("brand-no-transition");
        });
      });
    }
  }, [verbs.length]);

  useEffect(() => {
    if (mode !== "cycling" || verbs.length === 0) return;
    if (idx >= verbs.length - 1) {
      const timer = setTimeout(() => setMode("settled"), ROTATION_HOLD_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setIdx((i) => i + 1), ROTATION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [idx, mode, verbs.length]);

  if (!rotation) {
    return (
      <div
        className="flex h-12 w-full items-center justify-center"
        style={style}
        aria-hidden
      >
        <span
          className="text-[34px] font-bold leading-none text-slate-900 dark:text-slate-100"
          style={{ letterSpacing: "-0.04em" }}
        >
          kurl<span className="text-slate-400 dark:text-slate-500">.me</span>
        </span>
      </div>
    );
  }

  // phrase 안의 surrounding text (lead/join/tail/end) 는 settled 시 max-width:0 으로 collapse,
  // url + .me 는 양옆에서 붙으며 wordmark 크기로 scale up, k 는 prepend 되며 등장.
  // CSS-only morph (앞서 Flip 시도 → 초기 mount race + opacity 0 가 layout 차지하는 문제로
  // 폐기). 모든 collapse/expand transition 을 같은 duration 으로 묶어서 layout flash 차단.
  return (
    <div
      className="flex h-12 w-full items-center justify-center"
      style={style}
      aria-hidden
    >
      <span
        ref={containerRef}
        className={cn(
          "brand-rotator flex items-center whitespace-nowrap leading-none text-slate-900 dark:text-slate-100",
          mode === "settled" && "brand-settled",
        )}
      >
        <span data-fade>{rotation.lead}</span>
        <span data-k>k</span>
        <span>url</span>
        <span data-fade>{rotation.join}</span>
        <span data-fade>
          <FoldRotator verbs={verbs} activeIdx={idx} />
        </span>
        <span data-fade>{rotation.tail}</span>
        <span className="text-slate-400 dark:text-slate-500">.me</span>
        <span data-fade>{rotation.end}</span>
      </span>
    </div>
  );
}

function FoldRotator({
  verbs,
  activeIdx,
}: {
  verbs: string[];
  activeIdx: number;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const splitsRef = useRef<SplitTextInstance[]>([]);
  const gsapRef = useRef<GsapApi | null>(null);
  const activeIdxRef = useRef<number>(activeIdx);
  const prevIdxRef = useRef<number>(activeIdx);
  const initRef = useRef<boolean>(false);
  activeIdxRef.current = activeIdx;

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    void (async () => {
      const [{ default: gsap }, { SplitText }] = await Promise.all([
        import("gsap"),
        import("gsap/SplitText"),
      ]);
      if (cancelled || !containerRef.current) return;
      const SplitTextClass = SplitText as SplitTextCtor;
      gsap.registerPlugin(SplitTextClass);
      gsapRef.current = gsap;
      const slots = containerRef.current.querySelectorAll<HTMLElement>("[data-fold-slot]");
      splitsRef.current = Array.from(slots).map(
        (el) => new SplitTextClass(el, { type: "chars" }),
      );
      splitsRef.current.forEach((s, i) => {
        gsap.set(
          s.chars,
          i === activeIdxRef.current
            ? { rotateX: 0, y: 0, opacity: 1 }
            : { rotateX: -90, y: 15, opacity: 0 },
        );
      });
      prevIdxRef.current = activeIdxRef.current;
      initRef.current = true;
    })();
    return () => {
      cancelled = true;
      splitsRef.current.forEach((s) => s.revert());
      splitsRef.current = [];
      gsapRef.current = null;
      initRef.current = false;
    };
    // 한 번만 — verbs 배열은 locale 안에서 안정.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!initRef.current) return;
    const gsap = gsapRef.current;
    if (!gsap) return;
    if (prevIdxRef.current === activeIdx) return;
    const prev = splitsRef.current[prevIdxRef.current];
    const next = splitsRef.current[activeIdx];
    if (!prev || !next) return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      gsap.set(prev.chars, { rotateX: -90, y: 15, opacity: 0 });
      gsap.set(next.chars, { rotateX: 0, y: 0, opacity: 1 });
      prevIdxRef.current = activeIdx;
      return;
    }

    const tl = gsap.timeline();
    tl.to(prev.chars, {
      rotateX: 90,
      y: -15,
      opacity: 0,
      stagger: 0.025,
      duration: 0.35,
      ease: "power2.in",
      transformOrigin: "50% 0%",
    });
    tl.fromTo(
      next.chars,
      { rotateX: -90, y: 15, opacity: 0, transformOrigin: "50% 100%" },
      {
        rotateX: 0,
        y: 0,
        opacity: 1,
        stagger: 0.035,
        duration: 0.45,
        ease: "back.out(1.4)",
        transformOrigin: "50% 100%",
      },
      "-=0.2",
    );

    prevIdxRef.current = activeIdx;
    return () => {
      tl.kill();
    };
  }, [activeIdx]);

  return (
    <span
      ref={containerRef}
      className="relative inline-grid items-center"
      style={{ perspective: 800 }}
    >
      {verbs.map((v, i) => (
        <span
          key={i}
          data-fold-slot
          className="col-start-1 row-start-1"
          style={{
            display: "inline-block",
            transformStyle: "preserve-3d",
            // 초기 paint: active 만 보이게 (GSAP 인라인 set 전 한순간 모두 보이는 flash 방지).
            opacity: i === activeIdx ? 1 : 0,
          }}
        >
          {v}
        </span>
      ))}
    </span>
  );
}

function renderPhraseWithMeAccent(phrase: string) {
  // ".me" 는 워드마크의 slate-400 처리와 시각 운(韻)을 맞추려 분리 렌더.
  const parts = phrase.split(/(\.me)/g);
  return parts.map((part, i) =>
    part === ".me" ? (
      <span key={i} className="text-slate-400 dark:text-slate-500">
        .me
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 18" aria-hidden className={className}>
      <defs>
        <linearGradient id="kurl-login-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <g fill="url(#kurl-login-mark)">
        <rect className="mark-line mark-line-1" x="6" y="1" width="20" height="3.4" rx="1.7" />
        <rect className="mark-line mark-line-2" x="0" y="7.3" width="28" height="3.4" rx="1.7" />
        <rect className="mark-line mark-line-3" x="9" y="13.6" width="17" height="3.4" rx="1.7" />
      </g>
    </svg>
  );
}
