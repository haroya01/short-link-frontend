import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: { data: undefined as unknown, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
}));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/modules/notifications/lib/use-notifications", () => ({
  useNotifications: () => mocks.list,
  useMarkAllRead: () => ({ mutate: vi.fn() }),
  useReadHiddenNotices: () => undefined,
  useUnreadCount: () => 0,
}));
vi.mock("@/modules/notes/lib/note-filters", () => ({ useNoteFilters: () => [], noticeHidden: () => false }));
vi.mock("@/modules/notifications/components/notification-item", () => ({
  NotificationItem: ({ item }: { item: { id: number } }) => <div data-testid="row">{item.id}</div>,
}));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogChromeLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

import { NotificationBell } from "./notification-bell";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.list = { data: undefined, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function open() {
  await act(async () => root.render(<NotificationBell />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!.click());
}

describe("bell dropdown", () => {
  it("says the list failed to load and offers a retry, not 'no notifications'", async () => {
    mocks.list.isError = true;
    await open();
    const alert = host.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("notifications.loadError");
    expect(host.textContent).not.toContain("notifications.empty");
    await act(async () => alert.querySelector("button")!.click());
    expect(mocks.list.refetch).toHaveBeenCalledTimes(1);
  });

  it("still says there are none when the list is really empty", async () => {
    mocks.list.data = { pages: [{ items: [] }] };
    await open();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain("notifications.empty");
  });
});
