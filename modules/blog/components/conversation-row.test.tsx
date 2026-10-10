import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useLocale: () => "ko" }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, ...rest }: { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest} />,
}));
vi.mock("@/modules/blog/lib/author-href", () => ({ authorHref: (u: string) => `/p/${u}` }));

import { ConversationLike, ConversationRow, ConversationTombstone } from "./conversation-row";

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

const render = (node: React.ReactNode) => act(async () => root.render(node));
const nameLine = () => container.querySelector("[data-conversation-row] a:not([aria-hidden])")?.textContent;

describe("the conversation row", () => {
  it("reads display name · @handle · time", async () => {
    await render(
      <ConversationRow author={{ id: 2, username: "minji", displayName: "민지" }} createdAt="2026-05-30T10:00:00Z" time="3일">
        본문
      </ConversationRow>,
    );
    expect(nameLine()).toBe("민지@minji");
    const disc = container.querySelector("[data-avatar-tint]");
    expect(disc?.getAttribute("data-avatar-tint")).toBe("orange");
    expect(disc?.textContent).toBe("민");
    expect(container.querySelector("time")?.textContent).toBe("3일");
    expect(container.textContent).toContain("·");
  });

  it("shows only the @handle when there is no display name", async () => {
    await render(
      <ConversationRow author={{ id: 1, username: "dohyun" }} createdAt="2026-05-30T10:00:00Z" time="3일">
        본문
      </ConversationRow>,
    );
    expect(nameLine()).toBe("@dohyun");
  });

  it("does not link a missing author, and offers delete only when asked", async () => {
    await render(
      <ConversationRow author={null} createdAt="2026-05-30T10:00:00Z" time="3일" deleteLabel="삭제">
        본문
      </ConversationRow>,
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("button[aria-label='삭제']")).toBeNull();
  });
});

describe("the like", () => {
  it("shows its count, and only the heart at zero", async () => {
    await render(<ConversationLike liked={false} count={3} label="좋아요" onToggle={() => {}} />);
    expect(container.querySelector("[data-testid='like-count']")?.textContent).toBe("3");
    await render(<ConversationLike liked count={0} label="좋아요" onToggle={() => {}} />);
    expect(container.querySelector("[data-testid='like-count']")).toBeNull();
    expect(container.querySelector("button")?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("a deleted comment that still has replies", () => {
  it("keeps only its place: no name, time, link or action", async () => {
    await render(<ConversationTombstone id="comment-6" label="삭제된 댓글이에요" />);
    const row = container.querySelector("#comment-6")!;
    expect(row.textContent).toBe("삭제된 댓글이에요");
    expect(row.querySelectorAll("a, button, time")).toHaveLength(0);
  });
});
