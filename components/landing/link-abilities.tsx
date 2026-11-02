"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ABILITY_GROUPS } from "@/components/landing/ability-groups";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const SHORT_URL = "kurl.me/k8Tq2Za";

const FIRST_ACT_AFTER_MS = 1800;

const at = (ms: number) => ({ ["--at" as string]: `${ms}ms` }) as CSSProperties;

export function LinkAbilities() {
  const t = useTranslations("home.abilities");
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0);
  const [auto, setAuto] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (!entry.isIntersecting || timer) return;
        timer = setTimeout(() => setRevealed(true), Math.max(0, FIRST_ACT_AFTER_MS - performance.now()));
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const pick = (index: number) => {
    setAuto(false);
    setActive(index);
    setRun((n) => n + 1);
  };

  const advance = () => {
    if (active === ABILITY_GROUPS.length - 1) {
      setAuto(false);
      setActive(0);
    } else {
      setActive(active + 1);
    }
    setRun((n) => n + 1);
  };

  const current = ABILITY_GROUPS[active].key;

  return (
    <section
      ref={ref}
      aria-labelledby="link-abilities"
      data-paused={inView ? undefined : ""}
      className="ability-stage mx-auto mt-[max(3rem,9vh)] max-w-2xl"
    >
      <h2 id="link-abilities" className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("title")}
      </h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_336px] sm:items-start sm:gap-12">
        <ul className="border-t border-slate-200 dark:border-slate-800">
          {ABILITY_GROUPS.map((group, i) => {
            const on = i === active;
            return (
              <li
                key={group.key}
                data-testid="ability-group"
                className="relative border-b border-slate-200 dark:border-slate-800"
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={`ability-${group.key}`}
                    onClick={() => pick(i)}
                    className={`focus-ring w-full rounded-sm py-3.5 text-left text-[18px] font-semibold leading-snug tracking-[-0.015em] transition-colors sm:text-[20px] ${
                      on
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {t(`${group.key}.line`)}
                  </button>
                </h3>
                <div
                  id={`ability-${group.key}`}
                  aria-hidden={!on}
                  className={`grid transition-[grid-template-rows] duration-[420ms] ease-[var(--ease)] motion-reduce:transition-none ${
                    on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <p className="min-h-0 overflow-hidden">
                    <span className="block pb-4 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {group.items.map((item, n) => {
                        const more = n < group.items.length - 1;
                        return (
                          <span key={item}>
                            <span className="whitespace-nowrap">
                              {t(`${group.key}.items.${item}`)}
                              {more && " ·"}
                            </span>
                            {more && " "}
                          </span>
                        );
                      })}
                    </span>
                  </p>
                </div>
                {on && auto && !reduced && revealed && (
                  <span
                    key={run}
                    aria-hidden
                    data-testid="ability-progress"
                    className="ability-progress absolute inset-x-0 -bottom-px h-px origin-left bg-slate-900 dark:bg-slate-100"
                    onAnimationEnd={advance}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div
          key={`${current}-${run}`}
          aria-hidden
          data-testid="ability-stage"
          data-active={current}
          data-reveal={revealed ? "on" : "off"}
          className="flex h-[92px] items-start sm:mt-4"
        >
          {current === "access" && <AccessScene />}
          {current === "route" && <RouteScene />}
          {current === "watch" && <WatchScene />}
        </div>
      </div>
    </section>
  );
}

function AccessScene() {
  return (
    <div>
      <p className="font-mono text-[14px] text-slate-500 dark:text-slate-400">{SHORT_URL}</p>
      <div className="relative mt-3.5 flex w-[184px] items-center gap-3 pb-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="scene-in h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100" style={at(120 + i * 110)} />
        ))}
        <span className="absolute inset-x-0 bottom-0 h-px bg-slate-300 dark:bg-slate-700" />
        <span
          className="scene-line absolute inset-x-0 bottom-0 h-[2px] origin-left rounded-full bg-accent-600 dark:bg-accent-500"
          style={at(680)}
        />
      </div>
    </div>
  );
}

const BRANCHES = [
  { path: "M0 28 H10 C22 28 22 10 34 10 H44", to: "example.com/a", share: "70%" },
  { path: "M0 28 H10 C22 28 22 46 34 46 H44", to: "example.com/b", share: "30%" },
];

function RouteScene() {
  return (
    <div className="flex items-center font-mono text-[14px]">
      <span className="text-slate-500 dark:text-slate-400">{SHORT_URL}</span>
      <svg viewBox="0 0 44 56" className="mx-1 h-14 w-11 shrink-0 text-slate-300 dark:text-slate-700">
        {BRANCHES.map((branch) => (
          <path
            key={branch.to}
            d={branch.path}
            pathLength={1}
            className="scene-draw"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="flex h-14 flex-col justify-between">
        {BRANCHES.map((branch, i) => (
          <span key={branch.to} className="scene-in flex h-5 items-center gap-2 whitespace-nowrap" style={at(380 + i * 90)}>
            <span className="text-slate-500 dark:text-slate-400">{branch.to}</span>
            <span className="font-sans font-semibold tabular-nums text-slate-900 dark:text-slate-100">{branch.share}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function WatchScene() {
  const t = useTranslations("result");
  const scene = useTranslations("home.abilities.scene");
  const rows = [
    { text: "KR · iOS · instagram", bot: false },
    { text: "US · Bot · direct", bot: true },
    { text: `JP · Android · ${scene("flyer")}`, bot: false },
  ];
  return (
    <div className="text-[14px] text-slate-500 dark:text-slate-400">
      <p className="flex items-center gap-x-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
        <span className="inline-flex overflow-hidden">
          <span className="scene-roll inline-block font-semibold tabular-nums text-slate-900 dark:text-slate-100" style={at(820)}>
            {t("liveCount", { count: 2 })}
          </span>
        </span>
        <span className="scene-in tabular-nums" style={at(880)}>
          {t("liveBots", { count: 1 })}
        </span>
      </p>
      <ul className="mt-2 grid gap-1 text-slate-700 dark:text-slate-300">
        {rows.map((row, i) => (
          <li key={row.text} className="scene-in" style={at(i * 260)}>
            {row.bot ? (
              <span className="relative inline-block text-slate-500 dark:text-slate-400">
                {row.text}
                <span
                  data-testid="scene-strike"
                  className="scene-line absolute inset-x-0 top-1/2 h-px bg-slate-500 dark:bg-slate-400"
                  style={at(i * 260 + 380)}
                />
              </span>
            ) : (
              row.text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
