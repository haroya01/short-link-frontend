import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { realLinkStats } from "@/lib/link-stats-real.fixture";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}));

import { StatsOverview } from "./overview";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

describe("overview referrer sources", () => {
  it("shows direct visits and divides each source by every human click", () => {
    const root = document.createElement("template");
    root.innerHTML = renderToStaticMarkup(
      <StatsOverview
        data={realLinkStats()}
        slicedDaily={[]}
        range={30}
        onRange={() => {}}
        onNavigate={() => {}}
        stream={{ items: [], connected: false, reconnecting: false, count: 0, bots: 0 }}
        demo
      />,
    );
    const sources = Array.from(root.content.querySelectorAll("section")).find(
      (s) => s.querySelector("h2")?.textContent === "section.referrerHost.title",
    )!;
    const rows = Object.fromEntries(
      Array.from(sources.querySelectorAll("li")).map((li) => {
        const cells = li.querySelectorAll("span");
        return [li.querySelector('[data-testid="breakdown-name"]')?.textContent, cells[cells.length - 1].textContent];
      }),
    );
    expect(rows["instagram.com"]).toBe("34%");
    expect(rows["channel.direct"]).toBe("17%");
  });
});
