"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { blogHref } from "@/lib/host";
import { cn } from "@/lib/utils";
import { rememberSearch } from "@/modules/blog/lib/recent-searches";
import { glideMs } from "@/modules/blog/components/feed-sort-tabs";
import { ExploreLanePanel, type ExploreLane } from "@/modules/blog/components/explore-lanes";
import { ExploreSearchStarts } from "@/modules/blog/components/explore-search-starts";
import { SearchLiveResults } from "@/modules/blog/components/search-live-results";

const searchHref = (q: string) => blogHref(`/?q=${encodeURIComponent(q)}`);

const LANES: readonly ExploreLane[] = ["picks", "remote", "people"];
const PAD = 10;

function laneOf(value: string | null): ExploreLane {
  return value === "remote" || value === "people" ? value : "picks";
}

export function ExploreScreen() {
  const t = useTranslations("publicFeed");
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [lane, setLane] = useState<ExploreLane>("picks");
  const [visited, setVisited] = useState<ReadonlySet<ExploreLane>>(() => new Set<ExploreLane>(["picks"]));
  const [from, setFrom] = useState<ExploreLane | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const scrolls = useRef(new Map<ExploreLane, number>());
  const q = value.trim();

  function go(query: string) {
    rememberSearch(query);
    const url = new URL(searchHref(query), window.location.origin);
    if (url.origin === window.location.origin) router.push(url.pathname + url.search);
    else window.location.href = url.href;
  }

  function pick(next: ExploreLane) {
    if (next === lane) return;
    scrolls.current.set(lane, window.scrollY);
    setFrom(lane);
    setLane(next);
    setVisited((seen) => (seen.has(next) ? seen : new Set(seen).add(next)));
    const url = new URL(window.location.href);
    if (next === "picks") url.searchParams.delete("lane");
    else url.searchParams.set("lane", next);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }

  useLayoutEffect(() => {
    const linked = laneOf(new URLSearchParams(window.location.search).get("lane"));
    if (linked === "picks") return;
    setLane(linked);
    setVisited(new Set([linked]));
  }, []);

  useLayoutEffect(() => {
    if (from === null) return;
    const head = headRef.current;
    const saved = scrolls.current.get(lane);
    const top = head ? head.getBoundingClientRect().top + window.scrollY - 8 : 0;
    window.scrollTo({ top: saved ?? Math.min(window.scrollY, Math.max(top, 0)), behavior: "instant" as ScrollBehavior });
  }, [lane, from]);

  const order = (key: ExploreLane) => LANES.indexOf(key);
  const slide = from === null ? "" : order(lane) < order(from) ? "content-slide-back" : "content-slide-fwd";

  return (
    <div>
      <h1 className="sr-only">{t("exploreTitle")}</h1>
      <div
        ref={searchRef}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!searchRef.current?.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (q) go(q);
          }}
          className="relative"
        >
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown") return;
              const first = document.querySelector<HTMLButtonElement>("[data-domain-completion]");
              if (!first) return;
              e.preventDefault();
              first.focus();
            }}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-600 focus:ring-2 focus:ring-accent-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none sm:text-[15px]"
          />
        </form>
        <ExploreSearchStarts open={focused && !q} />
      </div>

      <div aria-live="polite">
        <SearchLiveResults
          value={value}
          active
          inputRef={inputRef}
          onPickHandle={(handle) => {
            setValue(handle);
            inputRef.current?.focus();
          }}
          onNavigate={() => rememberSearch(q)}
          onSeeAll={() => go(q)}
        />
      </div>

      <div hidden={q !== ""}>
        <LaneTabs headRef={headRef} lane={lane} onLane={pick} />
        <div className="min-h-[60vh]">
          {LANES.filter((key) => visited.has(key)).map((key) => (
            <div
              key={key}
              id={`explore-lane-${key}`}
              role="tabpanel"
              aria-labelledby={`explore-tab-${key}`}
              data-explore-lane={key}
              hidden={key !== lane}
              className={key === lane ? slide : undefined}
            >
              <ExploreLanePanel lane={key} onPeople={() => pick("people")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LaneTabs({
  headRef,
  lane,
  onLane,
}: {
  headRef: RefObject<HTMLElement>;
  lane: ExploreLane;
  onLane: (lane: ExploreLane) => void;
}) {
  const t = useTranslations("publicFeed");
  const tNotes = useTranslations("notes");
  const tabs = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number; ms: number } | null>(null);
  const label: Record<ExploreLane, string> = {
    picks: t("forYou"),
    remote: tNotes("feedFederated"),
    people: t("searchPeopleTab"),
  };

  useLayoutEffect(() => {
    const measure = (glide: boolean) => {
      const el = tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!el) return;
      const left = el.offsetLeft + PAD;
      const width = Math.max(el.offsetWidth - PAD * 2, 0);
      setBar((prev) => ({ left, width, ms: glide && prev ? glideMs(Math.abs(left - prev.left)) : 0 }));
    };
    measure(true);
    let first = true;
    const resized = new ResizeObserver(() => {
      if (first) first = false;
      else measure(false);
    });
    if (tabs.current) resized.observe(tabs.current);
    return () => resized.disconnect();
  }, [lane]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = LANES[(LANES.indexOf(lane) + step + LANES.length) % LANES.length];
    onLane(next);
    tabs.current?.querySelector<HTMLElement>(`[data-explore-tab="${next}"]`)?.focus();
  }

  return (
    <header
      ref={headRef}
      data-explore-head
      className="relative mt-4 flex items-center border-b border-slate-100 pb-3 dark:border-slate-800"
    >
      <div
        ref={tabs}
        role="tablist"
        aria-label={t("exploreTitle")}
        onKeyDown={onKeyDown}
        className="relative -ml-2.5 flex gap-1 text-[15px] font-bold"
      >
        {LANES.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`explore-tab-${key}`}
            aria-selected={lane === key}
            aria-controls={`explore-lane-${key}`}
            tabIndex={lane === key ? 0 : -1}
            data-explore-tab={key}
            onClick={() => onLane(key)}
            className={cn(
              "focus-ring touch-target whitespace-nowrap rounded px-2.5 py-1.5 transition-colors",
              lane === key
                ? "text-slate-900 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {label[key]}
          </button>
        ))}
        {bar && (
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-3 left-0 h-0.5 bg-slate-900 transition-[transform,width] ease-[var(--ease)] motion-reduce:transition-none dark:bg-slate-100"
            style={{ transform: `translateX(${bar.left}px)`, width: `${bar.width}px`, transitionDuration: `${bar.ms}ms` }}
          />
        )}
      </div>
    </header>
  );
}
