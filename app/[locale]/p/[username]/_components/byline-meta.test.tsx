import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPostDetail } from "@/modules/blog/api/public-posts";

const mocks = vi.hoisted(() => ({ me: null as null | { username: string } }));
const messages: Record<string, string> = {
  readingTime: "{minutes}분",
  "condition.FOLLOWERS": "팔로워 공개",
  "condition.UNLISTED": "링크로만 공개",
  "condition.PASSWORD": "비밀번호 글",
  "condition.REGION": "일부 나라 제한",
  "condition.COUNTRIES": "{countries} 제한",
  "condition.separator": "·",
};
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    Object.entries(values ?? {}).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), messages[key] ?? key),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: mocks.me }) }));

import { BylineMeta } from "./byline-meta";
import { setUnlockedPost } from "@/modules/blog/lib/unlocked-post-store";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  mocks.me = null;
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => setUnlockedPost(5, null));
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

type Access = Parameters<typeof BylineMeta>[0]["access"];

async function render(access: Access, minutes: number | null = 3) {
  await act(async () =>
    root.render(
      createElement(BylineMeta, {
        postId: 5,
        authorUsername: "hana",
        publishedAt: "2026-05-14T09:00:00Z",
        dateLabel: "2026년 5월 14일",
        minutes,
        access,
      }),
    ),
  );
}

function opened(post: Partial<PublicPostDetail["post"]>): PublicPostDetail {
  return {
    author: { id: 17, username: "hana", bio: null, avatarUrl: null },
    post: {
      id: 5, slug: "s", title: "t", excerpt: null, ogImageUrl: null, languageTag: "ko", tags: [], likeCount: 0,
      publishedAt: "2026-05-14T09:00:00Z", lastEditedAt: null, pinned: false, ...post,
    },
    blocks: [{ type: "PARAGRAPH", content: "가".repeat(1500), blockOrder: 0, cta: null }],
    series: null,
  };
}

describe("the byline of a post", () => {
  it("adds nothing for an everyone post", async () => {
    await render({ audience: "PUBLIC" });
    expect(host.textContent).toBe("2026년 5월 14일 · 3분");
  });

  it("names a keyed link-only post right in the server render", async () => {
    await render({ audience: "UNLISTED" });
    expect(host.textContent).toBe("2026년 5월 14일 · 3분 · 링크로만 공개");
    expect(host.querySelector("svg")).toBeNull();
  });

  it("shows only the date on a locked view", async () => {
    await render({ audience: "FOLLOWERS", locked: { reason: "FOLLOWERS" } }, null);
    expect(host.textContent).toBe("2026년 5월 14일");
  });

  it("fills in reading time and the condition once the browser opens it for a follower", async () => {
    await render({ audience: "FOLLOWERS", locked: { reason: "FOLLOWERS" } }, null);
    await act(async () => setUnlockedPost(5, opened({ audience: "FOLLOWERS", regionRestricted: true })));
    expect(host.textContent).toBe("2026년 5월 14일 · 3분 · 팔로워 공개 · 일부 나라 제한");
  });

  it("names the blocked countries to the owner only", async () => {
    mocks.me = { username: "hana" };
    await render({ audience: "FOLLOWERS", locked: { reason: "REGION_CHECK" } }, null);
    await act(async () =>
      setUnlockedPost(5, opened({ audience: "FOLLOWERS", regionRestricted: true, blockedCountries: ["JP", "CN"] })),
    );
    expect(host.textContent).toBe("2026년 5월 14일 · 3분 · 팔로워 공개 · 일본·중국 제한");

    mocks.me = { username: "someone-else" };
    await render({ audience: "FOLLOWERS", locked: { reason: "REGION_CHECK" } }, null);
    expect(host.textContent).toBe("2026년 5월 14일 · 3분 · 팔로워 공개 · 일부 나라 제한");
  });

  it("drops back to the bare date when the post locks again", async () => {
    await render({ audience: "PASSWORD", locked: { reason: "PASSWORD" } }, null);
    await act(async () => setUnlockedPost(5, opened({ audience: "PASSWORD" })));
    expect(host.textContent).toContain("비밀번호 글");
    await act(async () => setUnlockedPost(5, null));
    expect(host.textContent).toBe("2026년 5월 14일");
  });
});
