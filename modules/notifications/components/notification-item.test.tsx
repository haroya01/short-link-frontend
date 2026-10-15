import React, { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ko from "@/messages/ko.json";
import en from "@/messages/en.json";
import type { NotificationItem as Item } from "@/modules/notifications/api/notifications";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { username: "dohyun" } }) }));
vi.mock("@/modules/notifications/lib/use-notifications", () => ({
  useMarkRead: () => ({ mutate: vi.fn() }),
  requestOrigin: () => null,
}));
vi.mock("@/modules/notifications/components/follow-request-answer", () => ({ FollowRequestAnswer: () => null }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

import { NotificationItem } from "./notification-item";

const MESSAGES = { ko, en } as unknown as Record<string, AbstractIntlMessages>;

function notice(overrides: Partial<Item>): Item {
  return {
    id: 41,
    type: "POST_READ_MILESTONE",
    actorId: null,
    actorUsername: null,
    actorAvatarUrl: null,
    postId: 1,
    postSlug: "nextjs-14-app-router-blog",
    postTitle: "Next.js 14 App Router로 블로그를 다시 만든 이유",
    postAuthorUsername: null,
    seriesId: null,
    seriesSlug: null,
    seriesTitle: null,
    collectionId: null,
    collectionName: null,
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

let root: Root | null = null;
let host: HTMLElement;

async function render(item: Item, locale: "ko" | "en" = "ko") {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      createElement(NextIntlClientProvider, {
        locale,
        messages: MESSAGES[locale],
        timeZone: "Asia/Seoul",
        children: createElement(NotificationItem, { item }),
      }),
    ),
  );
  return host.querySelector<HTMLAnchorElement>("a[data-notification-row]");
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("reader notices", () => {
  it("say how many people read the post, grouped by the locale, and open the post", async () => {
    const row = await render(notice({ milestone: 1000 }));
    expect(row?.getAttribute("aria-label")).toBe("1,000명이 읽었어요, Next.js 14 App Router로 블로그를 다시 만든 이유");
    expect(row?.getAttribute("href")).toBe("/ko/p/dohyun/nextjs-14-app-router-blog");
    expect(host.textContent).toContain("1,000명이 읽었어요");
  });

  it("read in English with the count grouped", async () => {
    const row = await render(notice({ milestone: 1000 }), "en");
    expect(row?.getAttribute("aria-label")).toBe(
      "1,000 people have read your post, Next.js 14 App Router로 블로그를 다시 만든 이유",
    );
  });

  it("fall back to a count-free line when a milestone arrives without its number", async () => {
    const row = await render(notice({ milestone: null }));
    expect(row?.getAttribute("aria-label")).toBe("읽은 사람이 늘었어요, Next.js 14 App Router로 블로그를 다시 만든 이유");
  });

  it("announce the first reader with the post title as the second line", async () => {
    const row = await render(notice({ type: "POST_FIRST_READER", postSlug: "naming-things", postTitle: "이름 짓기" }));
    expect(row?.getAttribute("aria-label")).toBe("첫 독자가 생겼어요, 이름 짓기");
    expect(row?.getAttribute("href")).toBe("/ko/p/dohyun/naming-things");
  });

  it("show a person tile in the avatar slot, never an anonymous avatar or a profile link", async () => {
    for (const type of ["POST_FIRST_READER", "POST_READ_MILESTONE"] as const) {
      await render(notice({ type, milestone: 10 }));
      expect(host.querySelector("[data-avatar-tint]")).toBeNull();
      expect(host.querySelector("img")).toBeNull();
      expect(host.querySelectorAll("svg.lucide-user")).toHaveLength(1);
      expect(host.querySelectorAll("a")).toHaveLength(1);
      expect(host.textContent).not.toContain("누군가");
      await act(async () => root!.unmount());
      root = null;
      document.body.innerHTML = "";
    }
  });

  it("leave a notice with an actor on its avatar and corner glyph", async () => {
    const row = await render(
      notice({ type: "LIKE", actorId: 2, actorUsername: "minji", milestone: undefined, postSlug: "naming-things" }),
    );
    expect(row?.getAttribute("aria-label")).toContain("minji님이 내 글을 좋아해요");
    expect(host.querySelector("[data-avatar-tint]")).not.toBeNull();
    expect(host.querySelector("svg.lucide-user")).toBeNull();
    expect(host.querySelector("svg.lucide-heart")).not.toBeNull();
  });
});
