import React, { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicProfileEntry } from "@/types";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { THEME_TABLE } from "../_lib/theme";
import { EntryList } from "./entry-list";
import { FeaturedLink } from "./featured-link";
import { LinkEntryCard } from "./link-entry-card";
import { LinkRows } from "./link-rows";

const colors = THEME_TABLE.default;

function entry(overrides: Partial<PublicProfileEntry> = {}): PublicProfileEntry {
  return {
    kind: "LINK",
    id: 5,
    shortCode: "team-notes",
    shortUrl: "https://kurl.me/team-notes",
    originalUrl: null,
    ogTitle: null,
    ogImage: null,
    clickCount: 7,
    highlighted: false,
    protected: true,
    content: null,
    ...overrides,
  };
}

const open = entry({
  id: 1,
  shortCode: "gh",
  shortUrl: "https://kurl.me/gh",
  originalUrl: "https://github.com/dohyun",
  ogTitle: "GitHub",
  protected: false,
});

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(element: ReactElement) {
  await act(async () => root.render(createElement("ul", null, element)));
}

function linkTo(code: string): HTMLAnchorElement {
  const a = container.querySelector<HTMLAnchorElement>(`a[href^="https://kurl.me/${code}?"]`);
  if (!a) throw new Error(`no link to ${code}`);
  return a;
}

function expectLocked(a: HTMLAnchorElement, title: string) {
  expect(a.getAttribute("href")).toBe("https://kurl.me/team-notes?src=profile-dohyun");
  expect(a.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("protectedLink");
  expect(a.querySelectorAll("img")).toHaveLength(0);
  expect(a.textContent).toBe(title);
}

describe("a password link on the public profile", () => {
  it("draws a lock and the short URL in a row, with no favicon or host", async () => {
    await render(createElement(LinkRows, { entries: [open, entry()], username: "dohyun", colors }));
    expectLocked(linkTo("team-notes"), "kurl.me/team-notes");
    expect(linkTo("gh").querySelector('img[src*="favicons?domain=github.com"]')).not.toBeNull();
    expect(linkTo("gh").textContent).toBe("GitHubgithub.com");
  });

  it("keeps the owner's title when there is one", async () => {
    await render(createElement(LinkRows, { entries: [entry({ ogTitle: "팀 노트" })], username: "dohyun", colors }));
    expectLocked(linkTo("team-notes"), "팀 노트");
  });

  it("never previews a destination even if one arrives, in the standalone card", async () => {
    const leaked = entry({ originalUrl: "https://cdn.example.com/secret.png", ogImage: "https://cdn.example.com/og.png" });
    await render(createElement(LinkEntryCard, { entry: leaked, username: "dohyun", colors }));
    expectLocked(linkTo("team-notes"), "kurl.me/team-notes");
    expect(container.innerHTML).not.toContain("example.com");
  });

  it("drops the cover, favicon and host when featured", async () => {
    const featured = entry({ highlighted: true, ogImage: "https://cdn.example.com/og.png" });
    await render(createElement(FeaturedLink, { entry: featured, username: "dohyun", colors }));
    const a = linkTo("team-notes");
    expect(a.querySelectorAll("img")).toHaveLength(0);
    expect(a.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe("protectedLink");
    expect(a.textContent).toBe("featuredkurl.me/team-notes");
  });

  it("joins the plain rows instead of becoming a video card", async () => {
    const video = entry({ originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    await act(async () =>
      root.render(createElement(EntryList, { entries: [open, video], username: "dohyun", colors, emptyLabel: "" })),
    );
    expect(container.innerHTML).not.toContain("ytimg.com");
    expect(linkTo("team-notes").closest("ul")).toBe(linkTo("gh").closest("ul"));
    expectLocked(linkTo("team-notes"), "kurl.me/team-notes");
  });
});
