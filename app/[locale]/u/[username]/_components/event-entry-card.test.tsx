import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => ({ am: "오전", pm: "오후" })[key] ?? key,
}));

import { THEME_TABLE } from "../_lib/theme";
import { EventEntryCard } from "./event-entry-card";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function render(config: Record<string, string>) {
  const root = document.createElement("template");
  root.innerHTML = renderToStaticMarkup(
    <EventEntryCard id={1} content={JSON.stringify(config)} colors={THEME_TABLE.default} />,
  );
  return root.content;
}

const talk = {
  title: "북토크",
  startsAt: "2099-11-12T19:00:00+09:00",
  endsAt: "2099-11-12T21:00:00+09:00",
  location: "성수 카페 어니언",
};

describe("profile event block time line", () => {
  it("reads like the event page: range with day periods from messages, zone in parentheses", () => {
    expect(render(talk).textContent).toContain("오후 7:00 – 오후 9:00 (GMT+9)");
  });

  it("keeps the place on its own line instead of running after the time", () => {
    const place = Array.from(render(talk).querySelectorAll("p")).find((p) => p.textContent === talk.location);
    expect(place?.className).not.toMatch(/(^|\s)inline-flex(\s|$)/);
  });

  it("names both days when the event runs past midnight", () => {
    const text = render({ ...talk, endsAt: "2099-11-13T01:00:00+09:00" }).textContent ?? "";
    expect(text).toMatch(/11월 12일.*오후 7:00 –.*11월 13일.*오전 1:00 \(GMT\+9\)/);
  });
});
