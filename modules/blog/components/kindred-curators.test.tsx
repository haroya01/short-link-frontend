import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KindredCurator } from "@/modules/blog/api/collections";

const mocks = vi.hoisted(() => ({
  auth: { ready: true, me: { id: 1 } as { id: number } | null },
  listKindredCurators: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number }) =>
    values?.count === undefined ? key : `${key}:${values.count}`,
}));
vi.mock("@/modules/blog/api/collections", () => ({ listKindredCurators: mocks.listKindredCurators }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));

const curator = (id: number, username: string, sharedItems = 1): KindredCurator => ({
  curator: { id, username, bio: null, avatarUrl: null },
  sharedItems,
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { ready: true, me: { id: 1 } };
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function mount(initial: KindredCurator[]) {
  const { KindredCurators } = await import("./kindred-curators");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(KindredCurators, { username: "haruka", initial, locale: "ko" }));
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}
const names = () => Array.from(host.querySelectorAll("li a")).map((a) => a.textContent);

describe("curators who wove the same things", () => {
  it("swap the anonymous list for the signed-in reader's own, which leaves the reader out", async () => {
    mocks.listKindredCurators.mockResolvedValue([curator(3, "sora", 2), curator(4, "kazuki")]);
    await mount([curator(1, "dohyun", 3), curator(3, "sora", 2)]);
    expect(mocks.listKindredCurators).toHaveBeenCalledWith("haruka");
    expect(names()).toEqual(["S@sorasharedItems:2", "K@kazukisharedItems:1"]);
    expect(host.textContent).toContain("kindredCuratorsTitle");
  });

  it("hide the section when the reader was the only one listed", async () => {
    mocks.listKindredCurators.mockResolvedValue([]);
    await mount([curator(1, "dohyun", 3)]);
    expect(host.querySelector("section")).toBeNull();
  });

  it("keep the list already shown when the reader's own list fails", async () => {
    mocks.listKindredCurators.mockResolvedValue(null);
    await mount([curator(3, "sora", 2)]);
    expect(names()).toEqual(["S@sorasharedItems:2"]);
  });

  it("show the server's list to a visitor without asking again", async () => {
    mocks.auth = { ready: true, me: null };
    await mount([curator(3, "sora", 2)]);
    expect(mocks.listKindredCurators).not.toHaveBeenCalled();
    expect(names()).toEqual(["S@sorasharedItems:2"]);
  });
});
