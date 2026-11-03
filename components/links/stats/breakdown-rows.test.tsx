import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { realLinkStats } from "@/lib/link-stats-real.fixture";
import { sourceBreakdown } from "@/lib/stats-sources";
import { BreakdownRows } from "./breakdown-rows";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function shares(markup: string) {
  const root = document.createElement("template");
  root.innerHTML = markup;
  return Object.fromEntries(
    Array.from(root.content.querySelectorAll("li")).map((li) => {
      const cells = li.querySelectorAll("span");
      return [li.querySelector('[data-testid="breakdown-name"]')?.textContent, cells[cells.length - 1].textContent];
    }),
  );
}

describe("referrer sources on the overview", () => {
  it("adds direct visits from the response and divides by every human click", () => {
    const data = realLinkStats();
    const breakdown = sourceBreakdown(data, "직접 유입");
    expect(breakdown.total).toBe(1125);
    expect(breakdown.items).toContainEqual({ label: "직접 유입", count: 191 });

    const row = shares(renderToStaticMarkup(<BreakdownRows {...breakdown} maxItems={5} />));
    expect(row["instagram.com"]).toBe("34%");
    expect(row["직접 유입"]).toBe("17%");
  });

  it("a list that only holds part of the clicks, like utm_source, divides by the whole population", () => {
    const row = shares(renderToStaticMarkup(<BreakdownRows items={[{ label: "newsletter", count: 90 }]} total={1125} />));
    expect(row.newsletter).toBe("8.0%");
  });

  it("never lets the population be smaller than the rows it lists", () => {
    const row = shares(renderToStaticMarkup(<BreakdownRows items={[{ label: "a", count: 3 }]} total={1} />));
    expect(row.a).toBe("100%");
  });
});
