import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { RevealOnView } from "@/components/landing/reveal-on-view";

export const ABILITY_GROUPS = [
  { key: "access", items: ["password", "block", "schedule", "expiry"] },
  { key: "route", items: ["split", "targets", "openOutside", "card"] },
  { key: "watch", items: ["live", "bots", "qr"] },
] as const;

const SHORT_URL = "kurl.me/k8Tq2Za";

const at = (ms: number) => ({ ["--at" as string]: `${ms}ms` }) as CSSProperties;

export function LinkAbilities() {
  const t = useTranslations("home.abilities");
  return (
    <section aria-labelledby="link-abilities" className="mx-auto mt-28 max-w-2xl sm:mt-40">
      <h2 id="link-abilities" className="ability-row text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("title")}
      </h2>
      <ul className="mt-4 border-t border-slate-200 dark:border-slate-800">
        {ABILITY_GROUPS.map((group) => (
          <li
            key={group.key}
            data-testid="ability-group"
            className="ability-row grid gap-6 border-b border-slate-200 py-8 dark:border-slate-800 sm:grid-cols-[1fr_320px] sm:items-center sm:gap-10 sm:py-11"
          >
            <div>
              <h3 className="text-[21px] font-semibold leading-snug tracking-[-0.015em] text-slate-900 dark:text-slate-100 sm:text-[24px]">
                {t(`${group.key}.line`)}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {group.items.map((item, i) => {
                  const more = i < group.items.length - 1;
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
              </p>
            </div>
            <RevealOnView className="flex items-center sm:h-[88px]">
              {group.key === "access" && <AccessScene />}
              {group.key === "route" && <RouteScene />}
              {group.key === "watch" && <WatchScene />}
            </RevealOnView>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccessScene() {
  return (
    <div>
      <p className="font-mono text-[13px] text-slate-500 dark:text-slate-400">{SHORT_URL}</p>
      <div className="relative mt-3 flex w-[168px] items-center gap-2.5 pb-2.5">
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
    <div className="flex items-center font-mono text-[13px]">
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
    <div className="text-[13px] text-slate-500 dark:text-slate-400">
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
