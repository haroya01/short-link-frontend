import React, { act, createElement } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostDetailRead, PublicPostDetail, UnlockResult } from "@/modules/blog/api/public-posts";
import type { LockReason } from "@/modules/blog/lib/post-audience";

const mocks = vi.hoisted(() => ({
  auth: { ready: true, authenticated: false },
  readPostDetail: vi.fn(),
  unlockPost: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key) }));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("next/dynamic", () => ({
  default: () => (props: { detail: PublicPostDetail }) =>
    createElement("div", { "data-testid": "unlocked" }, props.detail.post.title),
}));
vi.mock("@/modules/blog/components/follow-button", () => ({
  FollowButton: () => createElement("button", { type: "button", "data-testid": "follow" }, "follow"),
}));
vi.mock("@/components/common/error-state", () => ({
  ErrorState: ({ onRetry }: { onRetry: () => void }) =>
    createElement("button", { type: "button", "data-testid": "retry", onClick: onRetry }, "retry"),
}));
vi.mock("@/modules/blog/api/public-posts", () => ({
  readPostDetail: mocks.readPostDetail,
  unlockPost: mocks.unlockPost,
}));

const POST_ID = 903;

function detail(locked?: LockReason): PostDetailRead {
  return {
    ok: true,
    data: {
      author: { id: 17, username: "hana", bio: null, avatarUrl: null },
      post: {
        id: POST_ID,
        slug: "locked-diary",
        title: "잠가 둔 일기",
        excerpt: null,
        ogImageUrl: null,
        languageTag: "ko",
        tags: [],
        likeCount: 0,
        publishedAt: "2026-05-13T09:00:00Z",
        lastEditedAt: null,
        pinned: false,
        audience: "PASSWORD",
        ...(locked ? { locked: { reason: locked } } : {}),
      },
      blocks: [],
      series: null,
    },
  };
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { ready: true, authenticated: false };
  window.sessionStorage.clear();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(reason: LockReason, postKey: string | null = null) {
  vi.resetModules();
  const { PostGate } = await import("./post-gate");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(PostGate, {
        username: "hana",
        slug: "locked-diary",
        postId: POST_ID,
        reason,
        postKey,
        locale: "ko",
        postUrl: "https://blog.kurl.me/@hana/locked-diary",
      }),
    );
  });
}

const gate = () => host.querySelector<HTMLElement>('[data-testid="post-gate"]');
const unlocked = () => host.querySelector('[data-testid="unlocked"]');
const storedGrant = () => window.sessionStorage.getItem(`kurl:post-grant:${POST_ID}`);

async function typeAndOpen(password: string) {
  const input = host.querySelector<HTMLInputElement>('input[type="password"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, password);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    host.querySelector<HTMLFormElement>("form")!.requestSubmit();
  });
}

function grantFor(seconds: number) {
  window.sessionStorage.setItem(
    `kurl:post-grant:${POST_ID}`,
    JSON.stringify({ grant: "held-grant", expiresAt: new Date(Date.now() + seconds * 1000).toISOString() }),
  );
}

describe("a region-checked post", () => {
  it("reads the detail from the browser, so the reader's own address decides, and shows the body when allowed", async () => {
    mocks.readPostDetail.mockResolvedValue(detail());
    await render("REGION_CHECK");
    expect(mocks.readPostDetail).toHaveBeenCalledWith("hana", "locked-diary", { key: null, grant: null });
    expect(unlocked()?.textContent).toBe("잠가 둔 일기");
  });

  it("shows the country notice and no way in when the reader's country is blocked", async () => {
    mocks.readPostDetail.mockResolvedValue(detail("REGION"));
    await render("REGION_CHECK");
    expect(gate()?.dataset.reason).toBe("REGION");
    expect(gate()?.textContent).toBe("publicPost.gate.region");
    expect(gate()?.querySelector("button, input")).toBeNull();
  });

  it("waits on a skeleton, not the notice, until the browser read answers", async () => {
    mocks.readPostDetail.mockReturnValue(new Promise(() => {}));
    await render("REGION_CHECK");
    expect(host.querySelector('[role="status"][aria-busy]')).not.toBeNull();
    expect(gate()).toBeNull();
  });

  it("sends the link key with the browser read of a link-only post", async () => {
    mocks.readPostDetail.mockResolvedValue(detail());
    await render("REGION_CHECK", "k-1");
    expect(mocks.readPostDetail).toHaveBeenCalledWith("hana", "locked-diary", { key: "k-1", grant: null });
  });

  it("treats a second REGION_CHECK from the browser as a failure to retry, not as an open post", async () => {
    mocks.readPostDetail.mockResolvedValue(detail("REGION_CHECK"));
    await render("REGION_CHECK");
    expect(host.querySelector('[data-testid="retry"]')).not.toBeNull();
    expect(unlocked()).toBeNull();
  });
});

describe("a followers-only post", () => {
  it("asks a signed-out reader to follow without reading anything", async () => {
    await render("FOLLOWERS");
    expect(mocks.readPostDetail).not.toHaveBeenCalled();
    expect(gate()?.dataset.reason).toBe("FOLLOWERS");
    expect(gate()?.querySelector('[data-testid="follow"]')).not.toBeNull();
  });

  it("opens for a signed-in follower, and re-reads after a follow lands", async () => {
    mocks.auth = { ready: true, authenticated: true };
    mocks.readPostDetail.mockResolvedValueOnce(detail("FOLLOWERS")).mockResolvedValueOnce(detail());
    await render("FOLLOWERS");
    expect(gate()?.dataset.reason).toBe("FOLLOWERS");
    await act(async () => {
      window.dispatchEvent(new CustomEvent("kurl:follow-changed"));
    });
    expect(mocks.readPostDetail).toHaveBeenCalledTimes(2);
    expect(unlocked()).not.toBeNull();
  });
});

describe("a password post", () => {
  it("keeps the gate with 비밀번호가 맞지 않아요 on a wrong password", async () => {
    mocks.unlockPost.mockResolvedValue({ ok: false, reason: "invalid" } satisfies UnlockResult);
    await render("PASSWORD");
    await typeAndOpen("nope");
    expect(mocks.unlockPost).toHaveBeenCalledWith("hana", "locked-diary", "nope");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("publicPost.gate.wrongPassword");
    expect(host.querySelector('input[type="password"]')?.getAttribute("aria-invalid")).toBe("true");
    expect(storedGrant()).toBeNull();
  });

  it("keeps a password typed before the session check answers", async () => {
    mocks.auth = { ready: false, authenticated: false };
    await render("PASSWORD");
    const input = host.querySelector<HTMLInputElement>('input[type="password"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "early");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    mocks.auth = { ready: true, authenticated: false };
    const { PostGate } = await import("./post-gate");
    await act(async () => {
      root.render(
        createElement(PostGate, {
          username: "hana",
          slug: "locked-diary",
          postId: POST_ID,
          reason: "PASSWORD",
          postKey: null,
          locale: "ko",
          postUrl: "https://blog.kurl.me/@hana/locked-diary",
        }),
      );
    });
    expect(host.querySelector('input[type="password"]')).toBe(input);
    expect(input.value).toBe("early");
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it("opens with a password typed into the server page before it came alive", async () => {
    mocks.auth = { ready: false, authenticated: false };
    vi.resetModules();
    const { PostGate } = await import("./post-gate");
    const { renderToString } = await import("react-dom/server");
    const element = createElement(PostGate, {
      username: "hana",
      slug: "locked-diary",
      postId: POST_ID,
      reason: "PASSWORD",
      postKey: null,
      locale: "ko",
      postUrl: "https://blog.kurl.me/@hana/locked-diary",
    });
    host = document.createElement("div");
    host.innerHTML = renderToString(element);
    document.body.append(host);
    host.querySelector<HTMLInputElement>('input[type="password"]')!.value = "before-js";
    await act(async () => {
      root = hydrateRoot(host, element);
    });
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it("says to try later when the server is limiting attempts", async () => {
    mocks.unlockPost.mockResolvedValue({ ok: false, reason: "attempts", retryAfter: 900 } satisfies UnlockResult);
    await render("PASSWORD");
    await typeAndOpen("again");
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("publicPost.gate.tooManyAttempts");
  });

  it("stores the grant for this tab and reads the body with it", async () => {
    mocks.unlockPost.mockResolvedValue({
      ok: true,
      grant: "fresh-grant",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    } satisfies UnlockResult);
    mocks.readPostDetail.mockResolvedValue(detail());
    await render("PASSWORD");
    await typeAndOpen("kurl-open");
    expect(storedGrant()).toContain("fresh-grant");
    expect(mocks.readPostDetail).toHaveBeenLastCalledWith("hana", "locked-diary", { key: null, grant: "fresh-grant" });
    expect(unlocked()).not.toBeNull();
  });

  it("drops a grant the server no longer honors and shows the password gate again", async () => {
    grantFor(3600);
    mocks.readPostDetail.mockResolvedValue(detail("PASSWORD"));
    await render("PASSWORD");
    expect(mocks.readPostDetail).toHaveBeenCalledWith("hana", "locked-diary", { key: null, grant: "held-grant" });
    expect(storedGrant()).toBeNull();
    expect(gate()?.dataset.reason).toBe("PASSWORD");
  });

  it("goes back to the gate when a call made with the grant answers 403 POST_LOCKED", async () => {
    grantFor(3600);
    mocks.readPostDetail.mockResolvedValue(detail());
    await render("PASSWORD");
    expect(unlocked()).not.toBeNull();
    await act(async () => {
      window.dispatchEvent(new CustomEvent("kurl:post-locked"));
    });
    expect(storedGrant()).toBeNull();
    expect(unlocked()).toBeNull();
    expect(gate()?.dataset.reason).toBe("PASSWORD");
  });

  it("turns into the country notice when unlocking from a blocked country", async () => {
    mocks.unlockPost.mockResolvedValue({ ok: false, reason: "region" } satisfies UnlockResult);
    await render("PASSWORD");
    await typeAndOpen("kurl-open");
    expect(gate()?.dataset.reason).toBe("REGION");
  });
});

describe("leaving KakaoTalk or LINE for the default browser", () => {
  const kakao =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5";
  const safari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const agent = (ua: string) => vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
  const handoff = () => host.querySelector<HTMLAnchorElement>('[data-testid="open-in-browser"]');

  afterEach(() => vi.restoreAllMocks());

  it("offers it under the follow button, since sign-in can be blocked in there", async () => {
    agent(kakao);
    await render("FOLLOWERS");
    expect(handoff()?.textContent).toBe("publicPost.gate.openInBrowser");
    expect(handoff()?.getAttribute("href")).toBe(`kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`);
    expect(gate()?.lastElementChild).toBe(handoff());
  });

  it("never offers it where no sign-in is needed", async () => {
    agent(kakao);
    await render("PASSWORD");
    expect(handoff()).toBeNull();
    await act(async () => root.unmount());
    mocks.readPostDetail.mockResolvedValue(detail("REGION"));
    await render("REGION_CHECK");
    expect(gate()?.dataset.reason).toBe("REGION");
    expect(handoff()).toBeNull();
  });

  it("never offers it in a regular browser", async () => {
    agent(safari);
    await render("FOLLOWERS");
    expect(handoff()).toBeNull();
  });
});

describe("what the byline learns from the gate", () => {
  async function renderWithProbe(reason: LockReason) {
    vi.resetModules();
    const { PostGate } = await import("./post-gate");
    const { useUnlockedPost } = await import("@/modules/blog/lib/unlocked-post-store");
    function Probe() {
      const opened = useUnlockedPost(POST_ID);
      return createElement("output", { "data-testid": "probe" }, opened ? opened.post.title : "none");
    }
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(
        createElement("div", null, [
          createElement(Probe, { key: "probe" }),
          createElement(PostGate, {
            key: "gate",
            username: "hana",
            slug: "locked-diary",
            postId: POST_ID,
            reason,
            postKey: null,
            locale: "ko",
            postUrl: "https://blog.kurl.me/@hana/locked-diary",
          }),
        ]),
      );
    });
  }
  const probe = () => host.querySelector('[data-testid="probe"]')?.textContent;

  it("hands over the opened post, and takes it back when the post locks again", async () => {
    grantFor(3600);
    mocks.readPostDetail.mockResolvedValue(detail());
    await renderWithProbe("PASSWORD");
    expect(probe()).toBe("잠가 둔 일기");
    await act(async () => {
      window.dispatchEvent(new CustomEvent("kurl:post-locked"));
    });
    expect(probe()).toBe("none");
  });

  it("hands over nothing while the post stays locked", async () => {
    await renderWithProbe("FOLLOWERS");
    expect(probe()).toBe("none");
  });
});
