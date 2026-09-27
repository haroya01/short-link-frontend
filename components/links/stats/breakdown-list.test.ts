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
