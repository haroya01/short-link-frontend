import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Topic, TopicPostsPage } from "@/modules/notes/api/topics";
import type { RemoteNotes } from "./use-remote-trending";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: false, ready: true },
  listTopics: vi.fn(),
  listTopicPosts: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/modules/notes/api/topics", () => ({
  TOPICS_LIMIT: 20,
  listTopics: mocks.listTopics,
  listTopicPosts: mocks.listTopicPosts,
}));
vi.mock("./use-remote-trending", () => ({ REMOTE_TRENDING_STALE_MS: 300_000 }));

import { useTopicPosts, useTopics, type Topics } from "./use-topics";

const snow: Topic = {
  id: "tag:첫눈",
  kind: "tag",
  tag: "첫눈",
  language: "ko",
  own: true,
  people: 24,
  related: [{ url: "https://baramnalssi.example/a", title: "주말 첫눈 예보", source: "바람날씨" }],
};

function page(uris: string[], next: string | null, topic: Topic | null = snow): TopicPostsPage {
  return {
    topic,
    items: uris.map((uri) => ({ kind: "pool", item: { uri } }) as TopicPostsPage["items"][number]),
    next,
  };
}

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { authenticated: false, ready: true };
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function flush() {
  for (let i = 0; i < 4; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function render(node: React.ReactNode) {
  await act(async () => root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>));
  await flush();
}

describe("the topics list", () => {
  let lane: Topics;
  let chips: Topics;
  const Lane = () => ((lane = useTopics()), null);
  const Chips = () => ((chips = useTopics()), null);

  it("is asked once for the lane and the search chips together", async () => {
    mocks.listTopics.mockResolvedValue([snow]);
    await render(
      <>
        <Lane />
        <Chips />
      </>,
    );
    expect(mocks.listTopics).toHaveBeenCalledTimes(1);
    expect(mocks.listTopics).toHaveBeenCalledWith(20);
    expect(lane.topics).toEqual([snow]);
    expect(chips.topics).toEqual([snow]);
  });

  it("is not settled until the session is known and the answer is in", async () => {
    mocks.auth = { authenticated: false, ready: false };
    let answer!: (topics: Topic[]) => void;
    mocks.listTopics.mockReturnValue(new Promise<Topic[]>((resolve) => (answer = resolve)));
    await render(<Lane />);
    expect(mocks.listTopics).not.toHaveBeenCalled();
    expect(lane.settled).toBe(false);

    mocks.auth = { authenticated: false, ready: true };
    await render(<Lane />);
    expect(mocks.listTopics).toHaveBeenCalledTimes(1);
    expect(lane.settled).toBe(false);

    await act(async () => answer([snow]));
    await flush();
    expect(lane).toMatchObject({ settled: true, topics: [snow] });
  });

  it("settles with no topics when the list is empty or the request fails", async () => {
    mocks.listTopics.mockResolvedValueOnce([]);
    await render(<Lane />);
    expect(lane).toMatchObject({ settled: true, topics: [] });

    client.clear();
    mocks.listTopics.mockRejectedValueOnce(new Error("404"));
    await render(<Lane key="again" />);
    expect(lane).toMatchObject({ settled: true, topics: [] });
  });

  it("asks for the longer list only once it is wanted", async () => {
    mocks.listTopics.mockResolvedValue([snow]);
    let full: Topics;
    const Full = ({ wanted }: { wanted: boolean }) => ((full = useTopics(40, wanted)), null);
    await render(<Full wanted={false} />);
    expect(mocks.listTopics).not.toHaveBeenCalled();
    expect(full!.settled).toBe(false);
    await render(<Full wanted />);
    expect(mocks.listTopics).toHaveBeenCalledWith(40);
    expect(full!.topics).toEqual([snow]);
  });
});

describe("a topic's posts", () => {
  let seen: { notes: RemoteNotes; topic: Topic | null };
  const Posts = ({ tag = "첫눈" }: { tag?: string }) => ((seen = useTopicPosts({ tag })), null);

  function loaded() {
    expect(seen.notes.state).toBe("ready");
    return seen.notes as Extract<RemoteNotes, { state: "ready" }>;
  }

  it("pages by the cursor each answer gives, to the end", async () => {
    mocks.listTopicPosts
      .mockResolvedValueOnce(page(["a", "b"], "t2"))
      .mockResolvedValueOnce(page(["c"], "r9"))
      .mockResolvedValueOnce(page(["d"], null));
    await render(<Posts />);
    expect(mocks.listTopicPosts).toHaveBeenLastCalledWith({ tag: "첫눈" }, null);
    expect(loaded().hasMore).toBe(true);
    expect(seen.topic).toEqual(snow);

    await act(async () => loaded().more());
    await flush();
    expect(mocks.listTopicPosts).toHaveBeenLastCalledWith({ tag: "첫눈" }, "t2");
    await act(async () => loaded().more());
    await flush();
    expect(mocks.listTopicPosts).toHaveBeenLastCalledWith({ tag: "첫눈" }, "r9");
    expect(loaded().pages.map((p) => p.items.length)).toEqual([2, 1, 1]);
    expect(loaded().hasMore).toBe(false);
    expect(mocks.listTopicPosts).toHaveBeenCalledTimes(3);
  });

  it("keeps what it has when a later page fails, and asks for the same page again", async () => {
    mocks.listTopicPosts
      .mockResolvedValueOnce(page(["a"], "t1"))
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce(page(["b"], null));
    await render(<Posts />);
    await act(async () => loaded().more());
    await flush();
    expect(loaded()).toMatchObject({ moreFailed: true, hasMore: true });
    expect(loaded().pages).toHaveLength(1);

    await act(async () => loaded().more());
    await flush();
    expect(mocks.listTopicPosts).toHaveBeenLastCalledWith({ tag: "첫눈" }, "t1");
    expect(loaded()).toMatchObject({ moreFailed: false, hasMore: false });
    expect(loaded().pages).toHaveLength(2);
  });

  it("says failed when the first page fails", async () => {
    mocks.listTopicPosts.mockRejectedValue(new Error("503"));
    await render(<Posts />);
    expect(seen.notes.state).toBe("failed");
  });

  it("has no topic for a tag that is not one", async () => {
    mocks.listTopicPosts.mockResolvedValue(page(["a"], null, null));
    await render(<Posts tag="kurl" />);
    expect(seen.topic).toBeNull();
    expect(loaded().pages[0].items).toHaveLength(1);
  });

  it("shows the topic the list already gave while the posts load, matching the tag whatever its case", async () => {
    client.setQueryData(["explore", "topics", 20, "anonymous"], [{ ...snow, tag: "Suica", id: "tag:suica" }]);
    mocks.listTopicPosts.mockReturnValue(new Promise(() => {}));
    await render(<Posts tag="suica" />);
    expect(seen.notes.state).toBe("loading");
    expect(seen.topic).toMatchObject({ id: "tag:suica" });
  });
});
