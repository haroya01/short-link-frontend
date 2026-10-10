import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: { data: undefined as unknown, isLoading: false, isError: false, isFetching: false, refetch: vi.fn() },
  unread: 0,
  filters: [] as string[],
  readAllFilters: [] as string[],
  readAll: vi.fn(),
}));
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: { count?: number }) =>
    values?.count != null ? `${namespace}.${key}:${values.count}` : `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/modules/notifications/lib/use-notifications", () => ({
  useNotifications: (filter: string) => {
    mocks.filters.push(filter);
    return mocks.list;
  },
  useMarkAllRead: (filter: string) => {
    mocks.readAllFilters.push(filter);
    return { mutate: mocks.readAll };
  },
  useReadHiddenNotices: () => undefined,
  useUnreadCount: () => mocks.unread,
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
  mocks.unread = 0;
  mocks.filters = [];
  mocks.readAllFilters = [];
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

  it("opens on everything and switches to mentions with their own empty line", async () => {
    mocks.list.data = { pages: [{ items: [] }] };
    await open();
    expect(mocks.filters.at(-1)).toBe("all");
    const mentions = host.querySelector<HTMLButtonElement>('[data-testid="notification-tab-mentions"]')!;
    expect(mentions.getAttribute("aria-selected")).toBe("false");
    await act(async () => mentions.click());
    expect(mocks.filters.at(-1)).toBe("mentions");
    expect(mentions.getAttribute("aria-selected")).toBe("true");
    expect(host.textContent).toContain("notifications.mentionsEmpty");
  });

  it("reads only mentions when 모두 읽음 is pressed on the mentions tab", async () => {
    mocks.unread = 3;
    mocks.list.data = { pages: [{ items: [] }] };
    await open();
    expect(mocks.readAllFilters.at(-1)).toBe("all");
    await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="notification-tab-mentions"]')!.click());
    expect(mocks.readAllFilters.at(-1)).toBe("mentions");
    const readAll = Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent === "notifications.markAllRead",
    )!;
    await act(async () => readAll.click());
    expect(mocks.readAll).toHaveBeenCalledTimes(1);
  });

  it("still says there are none when the list is really empty", async () => {
    mocks.list.data = { pages: [{ items: [] }] };
    await open();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain("notifications.empty");
  });
});

describe("bell unread mark", () => {
  const bell = () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;

  it("shows a dot, not a number, and puts the count in the name", async () => {
    mocks.unread = 128;
    await act(async () => root.render(<NotificationBell />));
    expect(bell().querySelector("[data-unread-dot]")).not.toBeNull();
    expect(bell().textContent).toBe("");
    expect(bell().getAttribute("aria-label")).toBe("notifications.title, notifications.unreadCount:128");
  });

  it("has no dot and a plain name when everything is read", async () => {
    await act(async () => root.render(<NotificationBell />));
    expect(bell().querySelector("[data-unread-dot]")).toBeNull();
    expect(bell().getAttribute("aria-label")).toBe("notifications.title");
  });
});
