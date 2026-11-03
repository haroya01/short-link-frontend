import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}));

import type { PublicEvent } from "@/modules/events/api/events";
import { EventPageView } from "./event-page-view";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

const NOW = Date.parse("2026-11-03T12:00:00Z");

const meetup: PublicEvent = {
  slug: "rust",
  title: "Rust 모각코",
  descriptionMd: null,
  coverImageUrl: null,
  startsAt: "2026-11-10T10:00:00Z",
  endsAt: "2026-11-10T12:00:00Z",
  timezone: "Asia/Seoul",
  locationText: "성수 카페",
  locationUrl: "https://maps.example.com/p/1",
  onlineUrl: "https://meet.example.com/abc",
  capacity: 10,
  spotsLeft: 7,
  closeAt: null,
  contactField: "EMAIL",
  status: "OPEN",
  acceptingRegistrations: true,
  attending: 3,
  organizerName: null,
  organizerAvatarUrl: null,
  questions: [],
};

function render(event: PublicEvent) {
  const root = document.createElement("template");
  root.innerHTML = renderToStaticMarkup(
    <EventPageView event={event} when={{ day: "11월 10일 (화)", time: "오후 7:00", zone: "대한민국 시간" }} now={NOW} />,
  );
  return root.content;
}

function registerButtons(root: DocumentFragment) {
  return Array.from(root.querySelectorAll("button")).filter((b) => b.textContent === "submit");
}

describe("event place and online links", () => {
  it("links the place and the online room", () => {
    const hrefs = Array.from(render(meetup).querySelectorAll("dl a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["https://maps.example.com/p/1", "https://meet.example.com/abc"]);
  });

  it("shows the place as text and leaves out the online row for non-web addresses", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", " javascript:alert(1)"]) {
      const root = render({ ...meetup, locationUrl: bad, onlineUrl: bad });
      expect(root.querySelectorAll("dl a")).toHaveLength(0);
      expect(root.textContent).toContain("성수 카페");
      expect(root.textContent).not.toContain("onlineLink");
    }
  });
});

describe("one register button in every state", () => {
  it("is the form's submit while the event is open", () => {
    const buttons = registerButtons(render(meetup));
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute("type")).toBe("submit");
    expect(buttons[0].hasAttribute("disabled")).toBe(false);
  });

  it.each([
    ["ended", { startsAt: "2026-08-13T11:14:00Z", endsAt: "2026-08-10T00:17:00Z" }, "endedNotice"],
    ["full", { spotsLeft: 0, acceptingRegistrations: false }, "fullNotice"],
    ["closed", { status: "CLOSED" as const, acceptingRegistrations: false }, "closedNotice"],
    ["canceled", { status: "CANCELED" as const, acceptingRegistrations: false }, "canceledNotice"],
  ])("is switched off with one status line when %s", (_, patch, notice) => {
    const root = render({ ...meetup, ...patch });
    const buttons = registerButtons(root);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].hasAttribute("disabled")).toBe(true);
    expect(root.querySelector("form")).toBeNull();
    expect(root.textContent).toContain(notice);
  });
});
