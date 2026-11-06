import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}));

import { AnalyticsPanel } from "./analytics-panel";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function names(html: string) {
  const root = document.createElement("template");
  root.innerHTML = html;
  return Array.from(root.content.querySelectorAll('[data-testid="breakdown-list"]')).map((list) =>
    Array.from(list.querySelectorAll('[data-testid="breakdown-name"]')).map((n) => n.textContent),
  );
}

describe("event analytics", () => {
  it("names apps and direct visits instead of printing the stored keys", () => {
    const html = renderToStaticMarkup(
      <AnalyticsPanel
        analytics={{
          totalClicks: 58,
          totalRegistrations: 7,
          registrationsByChannel: [
            { key: "단톡방", count: 4 },
            { key: "kakaotalk", count: 2 },
            { key: "direct", count: 1 },
          ],
          clicksByLink: [
            { key: "단톡방", count: 31 },
            { key: "?", count: 2 },
          ],
          clicksByClientApp: [
            { key: "kakaotalk", count: 29 },
            { key: "direct", count: 11 },
            { key: "whale", count: 3 },
          ],
          dailyRegistrations: [],
        }}
      />,
    );
    expect(names(html)).toEqual([
      ["단톡방", "clientApp.kakaotalk", "channel.direct"],
      ["단톡방", "unknown"],
      ["clientApp.kakaotalk", "clientApp.browser", "whale"],
    ]);
  });
});
