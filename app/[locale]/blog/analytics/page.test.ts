import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BlogAnalyticsPage from "./page";
import { getAuthorAnalyticsOverview, getPostPerformance, type AuthorAnalyticsOverview, type PostPerformancePage, type TopPost } from "@/modules/blog/api/analytics";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ ready: true, authenticated: true, me: { id: 1 } }) }));
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string, values?: { days?: number }) => values?.days === undefined ? key : `${key}:${values.days}`,
}));
vi.mock("@/modules/blog/api/analytics", () => ({ getAuthorAnalyticsOverview: vi.fn(), getPostAnalytics: vi.fn(), getPostPerformance: vi.fn(), getSeriesAnalytics: vi.fn() }));
vi.mock("@/modules/blog/api/posts", () => ({ listMyPosts: vi.fn() }));
vi.mock("@/modules/blog/components/workspace/analytics-area-chart", () => ({ AnalyticsAreaChart: () => null }));
vi.mock("@/components/common/logo", () => ({ Mark: () => null }));
vi.mock("@/i18n/navigation", () => ({ Link: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement("a", props) }));

function deferred<T>() {
  let resolve!: (data: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function overview(windowViews: number): AuthorAnalyticsOverview {
  return { totalPosts: 0, publishedPosts: 0, lifetimeViews: 0, lifetimeLikes: 0, windowDays: 7, windowViews, lifetimeLinkClicks: 0, windowLinkClicks: 0, lifetimeFollows: 0, windowFollows: 0, daily: [], referrers: [] };
}

describe("blog analytics period requests", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;

  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(getAuthorAnalyticsOverview).mockReset();
    vi.mocked(getPostPerformance).mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  async function mount() {
    await act(async () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(BlogAnalyticsPage))));
  }

  async function flush() {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
  }

  it("keeps 7D selected data when the older 30D response arrives last", async () => {
    const thirty = deferred<AuthorAnalyticsOverview>();
    const seven = deferred<AuthorAnalyticsOverview>();
    vi.mocked(getAuthorAnalyticsOverview).mockImplementation((days) => days === 7 ? seven.promise : thirty.promise);
    await mount();
    const sevenButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "analyticsDays:7")!;
    await act(async () => sevenButton.click());
    await act(async () => seven.resolve(overview(777)));
    await flush();
    expect(container.textContent).toContain("777");
    await act(async () => thirty.resolve(overview(3030)));
    await flush();
    expect(container.textContent).toContain("777");
    expect(container.textContent).not.toContain("3,030");
    expect(sevenButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a retryable error instead of the empty-analytics message", async () => {
    vi.mocked(getAuthorAnalyticsOverview).mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce(overview(999));
    await mount();
    await flush();
    expect(container.textContent).toContain("errorTitle");
    expect(container.textContent).not.toContain("analyticsEmpty");
    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "retry")!;
    await act(async () => retry.click());
    await flush();
    expect(container.textContent).toContain("999");
    expect(container.textContent).not.toContain("errorTitle");
  });

  it("discards a pending next page after changing the post sort", async () => {
    let observe: IntersectionObserverCallback | undefined;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { observe = callback; }
      observe() {}
      disconnect() {}
    });
    const post = (id: number, title: string): TopPost => ({ postId: id, slug: title, title, viewCount: 1, likeCount: 1, followsGained: 0 });
    const oldPage = deferred<PostPerformancePage>();
    vi.mocked(getAuthorAnalyticsOverview).mockResolvedValue({ ...overview(777), totalPosts: 30 });
    vi.mocked(getPostPerformance).mockImplementation((page, _size, sort) => {
      if (sort === "likes") return Promise.resolve({ items: [post(100, "likes-result")], page: 0, hasNext: false });
      if (page === 1) return oldPage.promise;
      return Promise.resolve({ items: Array.from({ length: 20 }, (_, i) => post(i, `views-result-${i}`)), page: 0, hasNext: true });
    });
    await mount();
    await flush();
    const click = async (label: string) => {
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label)!;
      expect(button).toBeTruthy();
      await act(async () => button.click());
    };
    await click("analyticsTabPosts");
    await click("analyticsViewAll");
    await act(async () => observe?.([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(getPostPerformance).toHaveBeenCalledWith(1, 20, "views");
    await click("analyticsSort.likes");
    await act(async () => oldPage.resolve({ items: [post(200, "stale-view-result")], page: 1, hasNext: false }));
    expect(container.textContent).toContain("likes-result");
    expect(container.textContent).not.toContain("stale-view-result");
  });
});
