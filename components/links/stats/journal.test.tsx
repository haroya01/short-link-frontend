import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { realLinkStats } from "@/lib/link-stats-real.fixture";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

import { StatsJournal } from "./journal";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

beforeAll(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
});

function openEvidence(key: string) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(<StatsJournal data={realLinkStats()} onNavigate={() => {}} initialVisible={5} />));
  const button = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.startsWith(key));
  expect(button, key).toBeDefined();
  act(() => button!.click());
  const panel = host.querySelector(`#journal-evidence-${key}`)!;
  return Object.fromEntries(
    Array.from(panel.querySelectorAll("li")).map((li) => {
      const cells = li.querySelectorAll("span");
      return [li.querySelector('[data-testid="breakdown-name"]')?.textContent, cells[cells.length - 1].textContent];
    }),
  );
}

describe("journal evidence uses the sentence's denominator", () => {
  it("in-app apps are shares of every human click, so they add up to the sentence's 31%", () => {
    const rows = openEvidence("inAppBrowser");
    expect(rows["clientApp.kakaotalk"]).toBe("17%");
    expect(rows["clientApp.instagram"]).toBe("9.0%");
  });

  it("the top source evidence lists direct visits and divides by every human click", () => {
    const rows = openEvidence("topSource");
    expect(rows["instagram.com"]).toBe("34%");
    expect(rows["channel.direct"]).toBe("17%");
  });
});

describe("journal sentences", () => {
  it("name the country instead of printing its code", () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<StatsJournal data={realLinkStats()} onNavigate={() => {}} initialVisible={20} />));
    const sentence = Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.startsWith("topCountry"));
    expect(sentence?.textContent).toContain('"country":"대한민국"');
  });
});
