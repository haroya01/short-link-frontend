import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/ko/p/yuna" }));
const api = vi.hoisted(() => ({ listBlockedUsers: vi.fn(), blockUser: vi.fn(), unblockUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname, useParams: () => ({ username: "yuna" }) }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ authenticated: true, me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/modules/blog/api/follows", () => api);

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.listBlockedUsers.mockResolvedValue([{ id: 15, username: "yuna", avatarUrl: null }]);
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

describe("a blocked author's page", () => {
  it("keeps the header and drops everything under the tabs", async () => {
    await render("/ko/p/yuna/notes");
    expect(host.textContent).toBe("header");
  });

  it("still shows a post opened directly", async () => {
    await render("/ko/p/yuna/kyoto-workation");
    expect(host.textContent).toBe("content");
  });
});
