import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  blocked: new Set<string>(),
  status: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, authenticated: true }) }));
vi.mock("@/modules/blog/lib/user-blocks", () => ({ useBlockedNames: () => mocks.blocked }));
vi.mock("@/modules/blog/lib/follow-status-cache", () => ({ fetchFollowStatus: mocks.status }));
vi.mock("@/modules/notes/components/blocked-author-notice", () => ({
  BlockedAuthorNotice: () => <div data-testid="author-blocked" />,
}));

import { AuthorGate, AuthorOnly } from "./author-gate";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.blocked = new Set();
  mocks.status.mockResolvedValue({ following: false, blocksViewer: false });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function Page() {
  return (
    <>
      <AuthorOnly username="rin">
        <div data-testid="actions" />
      </AuthorOnly>
      <AuthorGate username="rin" subject="post">
        <div data-testid="body" />
      </AuthorGate>
      <AuthorOnly username="rin">
        <div data-testid="toc" />
      </AuthorOnly>
    </>
  );
}

const has = (id: string) => host.querySelector(`[data-testid="${id}"]`) !== null;

describe("a post page around a blocked author", () => {
  it("keeps the actions, body and contents when nothing blocks", async () => {
    await act(async () => root.render(<Page />));
    expect(["actions", "body", "toc"].every(has)).toBe(true);
  });

  it("says the post is unavailable and drops actions and contents when the author blocks the reader", async () => {
    mocks.status.mockResolvedValue({ following: false, blocksViewer: true });
    await act(async () => root.render(<Page />));
    expect(host.querySelector('[data-testid="author-unavailable"]')!.textContent).toBe("notes.postUnavailable");
    expect(["actions", "body", "toc"].some(has)).toBe(false);
  });

  it("shows the blocked notice and drops actions and contents when the reader blocked the author", async () => {
    mocks.blocked = new Set(["rin"]);
    await act(async () => root.render(<Page />));
    expect(has("author-blocked")).toBe(true);
    expect(["actions", "body", "toc"].some(has)).toBe(false);
  });

  it("keeps the profile's wording outside a post", async () => {
    mocks.status.mockResolvedValue({ following: false, blocksViewer: true });
    await act(async () =>
      root.render(
        <AuthorGate username="rin">
          <div />
        </AuthorGate>,
      ),
    );
    expect(host.querySelector('[data-testid="author-unavailable"]')!.textContent).toBe("notes.authorUnavailable");
  });
});
