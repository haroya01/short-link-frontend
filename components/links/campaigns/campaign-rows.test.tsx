import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => (values?.rate ? `${key}:${values.rate}` : key),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { CampaignRows } from "./campaign-rows";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function cells(html: string) {
  const root = document.createElement("template");
  root.innerHTML = html;
  return [...root.content.querySelectorAll("li")].map((li) => [...li.children].map((c) => c.textContent));
}

describe("CampaignRows", () => {
  it("shows human clicks and clicks per 100 sheets for each row", () => {
    const html = renderToStaticMarkup(
      <CampaignRows rows={[{ key: 1, label: "역 앞", meta: "A · 강남", clicks: 12, quantity: 400 }]} />,
    );
    expect(cells(html)[0]).toEqual(["역 앞A · 강남", "", "12", "units.perHundred:3.0"]);
  });

  it("says — instead of a rate when nothing was handed out, and — for clicks before stats arrive", () => {
    const html = renderToStaticMarkup(
      <CampaignRows
        rows={[
          { key: 1, label: "아직 안 뿌림", clicks: 0, quantity: 0 },
          { key: 2, label: "숫자 전", clicks: null, quantity: 300 },
        ]}
      />,
    );
    expect(cells(html)).toEqual([
      ["아직 안 뿌림", "", "0", "—"],
      ["숫자 전", "", "—", "—"],
    ]);
  });
});
