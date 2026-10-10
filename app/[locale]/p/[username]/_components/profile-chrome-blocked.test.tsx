import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/ko/p/yuna" }));
const api = vi.hoisted(() => ({
  listBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  getFollowStatus: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname, useParams: () => ({ username: "yuna" }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ready: true, authenticated: true, me: { id: 1, username: "dohyun" } }),
}));
vi.mock("@/modules/blog/api/follows", () => api);

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.listBlockedUsers.mockResolvedValue([]);
  api.getFollowStatus.mockResolvedValue({ following: false, hideFollowerCount: false });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(pathname: string) {
  route.pathname = pathname;
  const { ProfileChrome } = await import("./profile-chrome");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <ProfileChrome header={<p>header</p>}>
        <p>content</p>
      </ProfileChrome>,
    );
  });
}

describe("an author the reader blocked", () => {
  beforeEach(() => {
    api.listBlockedUsers.mockResolvedValue([{ id: 15, username: "yuna", avatarUrl: null }]);
  });

  it("keeps the header and puts the blocked notice where the tab content was", async () => {
    await render("/ko/p/yuna/notes");
    expect(host.textContent).not.toContain("content");
    expect(host.querySelector('[data-testid="author-blocked"]')!.textContent).toContain("blockedAuthorNotice");
    expect(host.textContent).toContain("header");
  });

  it("still shows a post opened directly", async () => {
    await render("/ko/p/yuna/kyoto-workation");
    expect(host.textContent).toBe("content");
  });
});

describe("an author who blocked the reader", () => {
  it("shows the neutral unavailable line instead of the tab content", async () => {
    api.getFollowStatus.mockResolvedValue({ following: false, hideFollowerCount: false, blocksViewer: true });
    await render("/ko/p/yuna");
    expect(host.textContent).not.toContain("content");
    expect(host.querySelector('[data-testid="author-unavailable"]')!.textContent).toBe("authorUnavailable");
    expect(host.querySelector('[data-testid="author-blocked"]')).toBeNull();
  });

  it("changes nothing when the server sends no block flags", async () => {
    await render("/ko/p/yuna");
    expect(host.textContent).toBe("headercontent");
  });
});
