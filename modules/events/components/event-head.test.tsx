import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}));

import { EventHead, type EventHeadData } from "./event-head";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

const meetup: EventHeadData = {
  coverImageUrl: null,
  title: "Rust 모각코",
  organizerName: null,
  organizerAvatarUrl: null,
  startsAt: "2026-11-01T10:00:00Z",
  endsAt: "2026-11-01T12:00:00Z",
  timezone: "Asia/Seoul",
  locationText: "성수 카페",
  locationUrl: "https://maps.example.com/p/1",
  onlineUrl: "https://meet.example.com/abc",
  attending: 3,
  capacity: null,
  spotsLeft: null,
};

function render(event: EventHeadData) {
  const root = document.createElement("template");
  root.innerHTML = renderToStaticMarkup(<EventHead event={event} />);
  return root.content;
}

describe("event place and online links", () => {
  it("links the place and the online room", () => {
    const hrefs = Array.from(render(meetup).querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["https://maps.example.com/p/1", "https://meet.example.com/abc"]);
  });

  it("shows the place as text and leaves out the online row for non-web addresses", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", " javascript:alert(1)"]) {
      const root = render({ ...meetup, locationUrl: bad, onlineUrl: bad });
      expect(root.querySelectorAll("a")).toHaveLength(0);
      expect(root.textContent).toContain("성수 카페");
      expect(root.textContent).not.toContain("onlineLink");
    }
  });
});
