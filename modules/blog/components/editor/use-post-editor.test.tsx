import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostView } from "@/modules/blog/api/posts";
import { usePostEditor } from "./use-post-editor";

const api = vi.hoisted(() => ({
  getPost: vi.fn(), getBlocks: vi.fn(), updatePostMetadata: vi.fn(), replaceBlocks: vi.fn(),
  publishPost: vi.fn(), unpublishPost: vi.fn(), republishPost: vi.fn(), backToDraftPost: vi.fn(),
  schedulePost: vi.fn(), restoreRevision: vi.fn(), deletePost: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));
const translate = vi.hoisted(() => (key: string) => key);
vi.mock("@/modules/blog/api/posts", () => api);
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => translate }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [async () => true, null] }));
vi.mock("@/modules/blog/api/series", () => ({ assignPostToSeries: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/api/links", () => ({ shortenUrl: vi.fn() }));
vi.mock("@/modules/blog/components/feed-card", () => ({ postHref: () => "/post" }));

const POST: PostView = {
  id: 16, title: "Original title", slug: "draft", status: "DRAFT", languageTag: "en",
  tags: ["writing"], seriesId: null, seriesOrder: null, pinOrder: null, publishedAt: null,
  scheduledAt: null, excerpt: null, ogImageUrl: null, viewCount: 0, likeCount: 0,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

let root: Root;
let host: HTMLDivElement;
let editor: ReturnType<typeof usePostEditor>;

async function mount() {
  function Harness() {
    editor = usePostEditor(POST.id, { ready: true, authenticated: true });
    return null;
  }
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(createElement(Harness)); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.getPost.mockResolvedValue(POST);
  api.getBlocks.mockResolvedValue([]);
  api.updatePostMetadata.mockImplementation(async (_id, payload) => ({ ...POST, ...payload }));
  api.replaceBlocks.mockResolvedValue([]);
  api.schedulePost.mockResolvedValue({ ...POST, status: "SCHEDULED" });
  api.restoreRevision.mockResolvedValue(POST);
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  vi.useRealTimers();
});

describe("editor persistence boundaries", () => {
  it("allows a new save after an identical-payload no-op", async () => {
    await mount();
    await act(async () => { await editor.save(); await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenCalledTimes(1);
    await act(async () => { editor.setTitle("Changed after no-op"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      title: "Changed after no-op",
    }));
  });

  it("catches up the live editor before its debounced markdown callback fires", async () => {
    await mount();
    let liveBody = "First body";
    editor.liveMarkdown.current = () => liveBody;
    const pendingBlocks = deferred<[]>();
    api.replaceBlocks.mockReturnValueOnce(pendingBlocks.promise);
    let saving!: Promise<boolean>;
    await act(async () => { saving = editor.save(); });
    liveBody = "Typed before the 250 ms serialization debounce";
    await act(async () => { pendingBlocks.resolve([]); await saving; });
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [
      { type: "PARAGRAPH", content: liveBody },
    ]);
  });

  it("includes publish-panel prefills made while saving without marking them as user edits", async () => {
    await mount();
    const pendingBlocks = deferred<[]>();
    api.replaceBlocks.mockReturnValueOnce(pendingBlocks.promise);
    let saving!: Promise<boolean>;
    await act(async () => { saving = editor.save(); });
    await act(async () => {
      editor.setExcerptRaw("Prefilled opening line");
      editor.setCoverRaw("https://example.com/cover.jpg");
    });
    await act(async () => { pendingBlocks.resolve([]); await saving; });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      excerpt: "Prefilled opening line", ogImageUrl: "https://example.com/cover.jpg",
    }));
  });

  it("persists edits made during a pending save before Back navigates away", async () => {
    await mount();
    await act(async () => { editor.setTitle("First edit"); });
    const pendingBlocks = deferred<[]>();
    api.replaceBlocks.mockReturnValueOnce(pendingBlocks.promise);
    let leaving!: Promise<void>;
    await act(async () => { leaving = editor.leave(); });
    expect(router.push).not.toHaveBeenCalled();

    await act(async () => {
      editor.setTitle("Last edit while saving");
      editor.setMarkdown("The last body edit");
    });
    await act(async () => { pendingBlocks.resolve([]); await leaving; });

    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      title: "Last edit while saving",
    }));
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [
      { type: "PARAGRAPH", content: "The last body edit" },
    ]);
    expect(router.push).toHaveBeenCalledOnce();
  });

  it("does not schedule an older snapshot when saving the current draft fails", async () => {
    await mount();
    api.replaceBlocks.mockRejectedValueOnce(new Error("Save unavailable"));
    let result: boolean | undefined;
    await act(async () => { result = await editor.schedule("2099-01-01T12:00"); });
    expect(result).toBe(false);
    expect(api.schedulePost).not.toHaveBeenCalled();
    expect(editor.error).toBe("Save unavailable");
  });

  it("finishes an in-flight save before restoring a revision", async () => {
    await mount();
    await act(async () => { editor.setMarkdown("Unrestored body"); });
    const pendingBlocks = deferred<[]>();
    api.replaceBlocks.mockReturnValueOnce(pendingBlocks.promise);
    let saving!: Promise<boolean>;
    let restoring!: Promise<void>;
    await act(async () => { saving = editor.save(); });
    await act(async () => { restoring = editor.restoreRevision(3); });
    expect(api.restoreRevision).not.toHaveBeenCalled();

    await act(async () => { pendingBlocks.resolve([]); await saving; await restoring; });
    expect(api.restoreRevision).toHaveBeenCalledWith(16, 3);
    expect(api.replaceBlocks.mock.invocationCallOrder[0]).toBeLessThan(
      api.restoreRevision.mock.invocationCallOrder[0],
    );
  });
});
