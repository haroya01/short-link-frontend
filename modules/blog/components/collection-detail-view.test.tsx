import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCollection: vi.fn() }));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-view-transitions", () => ({ Link: (props: { children: React.ReactNode }) => <a>{props.children}</a> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, authenticated: true, me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/modules/blog/api/collections", () => ({
  getCollection: mocks.getCollection,
  deleteCollection: vi.fn(),
  disconnect: vi.fn(),
  reorderConnections: vi.fn(),
  updateCollection: vi.fn(),
}));

import { CollectionDetailView } from "./collection-detail-view";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("collection detail load", () => {
  it("shows a failed load as an error with a retry, not as 'not found'", async () => {
    mocks.getCollection.mockRejectedValueOnce(new Error("500")).mockResolvedValueOnce(null);
    await act(async () => root.render(<CollectionDetailView collectionId={3} locale="ko" />));
    expect(host.textContent).toContain("collections.loadError");
    expect(host.textContent).not.toContain("collections.notFound");

    const retry = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "common.retry")!;
    await act(async () => retry.click());
    expect(mocks.getCollection).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain("collections.notFound");
  });
});
