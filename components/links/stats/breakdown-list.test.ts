import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BreakdownList } from "./breakdown-list";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
afterEach(() => vi.unstubAllGlobals());

describe("BreakdownList population percentages", () => {
  it("limits visible rows without inflating the remaining percentages", () => {
    vi.stubGlobal("React", React);
    const items = Array.from({ length: 6 }, (_, i) => ({ label: `source-${i}`, count: 10 }));
    const html = renderToStaticMarkup(React.createElement(BreakdownList, { items, maxItems: 5 }));
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelectorAll("li")).toHaveLength(5);
    expect(container.textContent).not.toContain("source-5");
    expect(container.textContent?.match(/17%/g)).toHaveLength(5);
    expect(container.textContent).not.toContain("20%");
  });
});

describe("BreakdownList row grammar", () => {
  function render(props: Parameters<typeof BreakdownList>[0]) {
    vi.stubGlobal("React", React);
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(React.createElement(BreakdownList, props));
    return container;
  }
  const items = [
    { label: "instagram.com", count: 30 },
    { label: "a-very-long-referrer-host.example.co.kr", count: 10 },
  ];

  it("gives the name its own line on a phone and drops the bar to the row under it", () => {
    const row = render({ items }).querySelector("li")!;
    const [name, bar, count, share] = [...row.children] as HTMLElement[];
    expect(name.textContent).toBe("instagram.com");
    expect(row.className).toContain("grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(bar.className).toContain("row-start-2");
    expect(bar.className).toContain("col-span-full");
    expect([count.textContent, share.textContent]).toEqual(["30", "75%"]);
  });

  it("lets the bar take only the width the name leaves, capped so numbers stay near names", () => {
    const list = render({ items }).querySelector("ul")!;
    expect(list.className).toContain("sm:grid-cols-[minmax(0,max-content)_minmax(4rem,24rem)_auto_auto]");
    expect(list.querySelector("li")!.className).toContain("sm:grid-cols-subgrid");
  });

  it("joins a parent grid when asked so sibling lists line up as one table", () => {
    const list = render({ items, subgrid: true }).querySelector("ul")!;
    expect(list.className).toContain("sm:grid-cols-subgrid");
    expect(list.className).not.toContain("minmax(4rem,24rem)");
  });

  it("says there is no data in a plain left-aligned line", () => {
    const empty = render({ items: [] }).querySelector("p")!;
    expect(empty.textContent).toBe("noData");
    expect(empty.className).not.toContain("text-center");
  });
});
