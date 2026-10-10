import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { PostView } from "@/modules/blog/api/posts";
import { usePostEditor } from "./use-post-editor";

const api = vi.hoisted(() => ({
  getPost: vi.fn(), getBlocks: vi.fn(), updatePostMetadata: vi.fn(), replaceBlocks: vi.fn(),
  publishPost: vi.fn(), unpublishPost: vi.fn(), republishPost: vi.fn(), backToDraftPost: vi.fn(),
  schedulePost: vi.fn(), restoreRevision: vi.fn(), deletePost: vi.fn(), createPost: vi.fn(),
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));
const translate = vi.hoisted(() => Object.assign((key: string) => key, { has: () => false }));
const confirmLeave = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/modules/blog/api/posts", () => api);
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => translate }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [confirmLeave, null] }));
vi.mock("@/modules/blog/api/series", () => ({ assignPostToSeries: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/api/links", () => ({ shortenUrl: vi.fn() }));
vi.mock("@/modules/blog/lib/author-href", () => ({ postHref: () => "/post" }));

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

async function mount(postId: number | null = POST.id) {
  function Harness() {
    editor = usePostEditor(postId, { ready: true, authenticated: true });
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
  api.getBlocks.mockResolvedValue({ blocks: [], contentVersion: null });
  api.updatePostMetadata.mockImplementation(async (id, payload) => {
    if (payload.slug !== undefined && payload.slug.length < 2) {
      throw new ApiError(400, { title: "Bad Request", status: 400, detail: "slug length 2~200" });
    }
    return { ...POST, id, ...payload };
  });
  api.replaceBlocks.mockResolvedValue({ blocks: [], contentVersion: null });
  api.schedulePost.mockResolvedValue({ ...POST, status: "SCHEDULED" });
  api.restoreRevision.mockResolvedValue(POST);
  api.createPost.mockResolvedValue({ ...POST, id: 77, title: "", slug: "draft-new" });
  window.history.replaceState(null, "", "/en/blog/write/new");
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
    ], {});
  });

  it("includes publish-panel prefills made while saving without marking them as user edits", async () => {
    await mount();
    const pendingBlocks = deferred<[]>();
    api.replaceBlocks.mockReturnValueOnce(pendingBlocks.promise);
    let saving!: Promise<boolean>;
    await act(async () => { saving = editor.save(); });
    await act(async () => {
      editor.setExcerptRaw("Prefilled opening line");
      editor.prefillCover("https://example.com/cover.jpg");
    });
    await act(async () => { pendingBlocks.resolve([]); await saving; });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      excerpt: "Prefilled opening line", ogImageUrl: "https://example.com/cover.jpg", coverChosen: false,
    }));
  });

  it("sends a cover the author sets as chosen, and keeps a chosen cover chosen on later saves", async () => {
    await mount();
    await act(async () => { editor.setCover("https://example.com/picked.jpg"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      ogImageUrl: "https://example.com/picked.jpg", coverChosen: true,
    }));

    await act(async () => { editor.setTitle("Later edit"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      title: "Later edit", coverChosen: true,
    }));

    await act(async () => { editor.setCover(null); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      ogImageUrl: "", coverChosen: false,
    }));
  });

  it("keeps the server's choice for a cover loaded with the post", async () => {
    api.getPost.mockResolvedValue({ ...POST, ogImageUrl: "https://example.com/picked.jpg", coverChosen: true });
    await mount();
    await act(async () => { editor.setTitle("Edited"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      ogImageUrl: "https://example.com/picked.jpg", coverChosen: true,
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
    ], {});
    expect(router.push).toHaveBeenCalledOnce();
  });

  it("does not schedule an older snapshot when saving the current draft fails", async () => {
    await mount();
    api.replaceBlocks.mockRejectedValueOnce(new Error("Save unavailable"));
    let result: boolean | undefined;
    await act(async () => { result = await editor.schedule("2099-01-01T12:00"); });
    expect(result).toBe(false);
    expect(api.schedulePost).not.toHaveBeenCalled();
    // 원문("Save unavailable")이 아니라 번역된 대체 문구가 뜬다.
    expect(editor.error).toBe("saveFailed");
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

describe("a new post exists only once there is something to keep", () => {
  it("creates nothing when opened and left blank, even after typing and clearing", async () => {
    await mount(null);
    expect(editor.loading).toBe(false);
    await act(async () => { editor.setTitle("a"); });
    await act(async () => { editor.setTitle(""); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    await act(async () => { await editor.leave(); });
    expect(api.createPost).not.toHaveBeenCalled();
    expect(api.updatePostMetadata).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledOnce();
  });

  it("creates the draft on the first autosave, saves into it and moves the address to its id", async () => {
    await mount(null);
    await act(async () => { editor.setTitle("A first line"); });
    expect(api.createPost).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(api.createPost).toHaveBeenCalledOnce();
    expect(api.createPost).toHaveBeenCalledWith(expect.objectContaining({
      title: "A first line", slug: expect.stringMatching(/^draft-/),
    }));
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(77, expect.objectContaining({
      title: "A first line", slug: "draft-new",
    }));
    expect(window.location.pathname).toBe("/en/blog/write/77");
  });

  it("creates one draft when an image upload and the autosave arrive together", async () => {
    await mount(null);
    const created = deferred<PostView>();
    api.createPost.mockReturnValueOnce(created.promise);
    await act(async () => { editor.setMarkdown("Body with a photo"); });
    let upload!: Promise<PostView>;
    let saving!: Promise<boolean>;
    await act(async () => { upload = editor.ensurePost(); saving = editor.save(); });
    await act(async () => {
      created.resolve({ ...POST, id: 77, title: "", slug: "draft-new" });
      await upload;
      await saving;
    });
    expect(api.createPost).toHaveBeenCalledOnce();
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(77, [
      { type: "PARAGRAPH", content: "Body with a photo" },
    ], {});
  });

  it("discards a never-saved post without deleting anything", async () => {
    await mount(null);
    await act(async () => { editor.setTitle("Second thoughts"); });
    await act(async () => { await editor.remove(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(api.createPost).not.toHaveBeenCalled();
    expect(api.deletePost).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledOnce();
  });

  it("publishes the draft the save just created", async () => {
    await mount(null);
    api.publishPost.mockResolvedValue({ ...POST, id: 77, status: "PUBLISHED", slug: "draft-new" });
    await act(async () => {
      editor.setTitle("Ready to go");
      editor.setTags(["writing"]);
    });
    let published: boolean | undefined;
    await act(async () => {
      await editor.save();
      published = await editor.changeStatus("publish");
    });
    expect(published).toBe(true);
    expect(api.createPost).toHaveBeenCalledOnce();
    expect(api.publishPost).toHaveBeenCalledWith(77);
  });
});

describe("the browser's Back leaves the editor like its own back button", () => {
  let back: MockInstance<History["back"]>;
  let push: MockInstance<History["pushState"]>;
  beforeEach(() => {
    back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    push = vi.spyOn(window.history, "pushState");
  });
  afterEach(() => {
    back.mockRestore();
    push.mockRestore();
  });

  async function pressBack() {
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
      await vi.advanceTimersByTimeAsync(10);
    });
  }

  it("lets Back go untouched while nothing is edited", async () => {
    await mount();
    await pressBack();
    expect(window.history.state?.kurlEditorGuard).toBeUndefined();
    expect(back).not.toHaveBeenCalled();
    expect(api.updatePostMetadata).not.toHaveBeenCalled();
  });

  it("saves a draft's last keystrokes, then continues Back", async () => {
    await mount();
    await act(async () => { editor.setTitle("Typed right before Back"); });
    expect(window.history.state).toMatchObject({ kurlEditorGuard: true });
    await pressBack();
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({
      title: "Typed right before Back",
    }));
    expect(back).toHaveBeenCalledOnce();
  });

  it("stays on the draft and guards Back again when the save fails", async () => {
    await mount();
    await act(async () => { editor.setMarkdown("Body the server refuses"); });
    api.replaceBlocks.mockRejectedValueOnce(new Error("Save unavailable"));
    await pressBack();
    expect(back).not.toHaveBeenCalled();
    expect(editor.error).toBe("saveFailed");
    expect(push).toHaveBeenCalledTimes(2);
    expect(window.history.state).toMatchObject({ kurlEditorGuard: true });
  });

  it("asks before dropping a published post's unsaved edits, and stays when declined", async () => {
    api.getPost.mockResolvedValue({ ...POST, status: "PUBLISHED" });
    await mount();
    await act(async () => { editor.setTitle("Unsaved live edit"); });

    confirmLeave.mockResolvedValueOnce(false);
    await pressBack();
    expect(confirmLeave).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
    expect(window.history.state).toMatchObject({ kurlEditorGuard: true });

    confirmLeave.mockResolvedValueOnce(true);
    await pressBack();
    expect(back).toHaveBeenCalledOnce();
    expect(api.updatePostMetadata).not.toHaveBeenCalled();
  });
});

describe("a slug the server would refuse never blocks the title and body", () => {
  it("leaves an emptied or one-letter slug out of the save", async () => {
    await mount();
    await act(async () => {
      editor.setSlug("한글");
      editor.setMarkdown("Body saved anyway");
    });
    expect(editor.slug).toBe("");
    let saved: boolean | undefined;
    await act(async () => { saved = await editor.save(); });
    expect(saved).toBe(true);
    expect(api.updatePostMetadata.mock.lastCall?.[1]).not.toHaveProperty("slug");
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [
      { type: "PARAGRAPH", content: "Body saved anyway" },
    ], {});
  });

  it("saves the title and body when the slug is taken, then says so", async () => {
    await mount();
    api.updatePostMetadata.mockImplementation(async (id, payload) => {
      if (payload.slug === "taken") {
        throw new ApiError(409, { status: 409, title: "Conflict", code: "SLUG_CONFLICT" });
      }
      return { ...POST, id, ...payload };
    });
    await act(async () => {
      editor.setSlug("taken");
      editor.setTitle("Title kept");
      editor.setMarkdown("Body kept");
    });
    let saved: boolean | undefined;
    await act(async () => { saved = await editor.save(); });
    expect(saved).toBe(false);
    expect(editor.error).toBe("slugTaken");
    expect(editor.slugError).toBe("slugTaken");
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ title: "Title kept" }));
    expect(api.updatePostMetadata.mock.lastCall?.[1]).not.toHaveProperty("slug");
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [{ type: "PARAGRAPH", content: "Body kept" }], {});

    await act(async () => { editor.setSlug("taken-2"); });
    expect(editor.slugError).toBeNull();
    expect(editor.error).toBeNull();
  });

  it("creates the draft under a generated slug when the typed one is taken, then flags the typed one", async () => {
    await mount(null);
    api.createPost.mockImplementation(async ({ slug }) => {
      if (slug === "taken") throw new ApiError(409, { status: 409, title: "Conflict", code: "SLUG_CONFLICT" });
      return { ...POST, id: 77, title: "", slug };
    });
    api.updatePostMetadata.mockImplementation(async (id, payload) => {
      if (payload.slug === "taken") {
        throw new ApiError(409, { status: 409, title: "Conflict", code: "SLUG_CONFLICT" });
      }
      return { ...POST, id, ...payload };
    });
    await act(async () => {
      editor.setSlug("taken");
      editor.setMarkdown("Body kept");
    });
    await act(async () => { await editor.save(); });
    expect(api.createPost).toHaveBeenCalledTimes(2);
    expect(api.createPost.mock.lastCall?.[0].slug).not.toBe("taken");
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(77, [{ type: "PARAGRAPH", content: "Body kept" }], {});
    expect(editor.slug).toBe("taken");
    expect(editor.slugError).toBe("slugTaken");
  });

  it("saves the title and body when the slug is a profile page name, then says why", async () => {
    await mount();
    const known = vi.spyOn(translate, "has") as MockInstance<(code: string) => boolean>;
    known.mockReturnValue(true);
    api.updatePostMetadata.mockImplementation(async (id, payload) => {
      if (payload.slug === "notes") {
        throw new ApiError(400, { status: 400, title: "Bad Request", code: "SLUG_RESERVED" });
      }
      return { ...POST, id, ...payload };
    });
    await act(async () => {
      editor.setSlug("notes");
      editor.setTitle("Title kept");
      editor.setMarkdown("Body kept");
    });
    let saved: boolean | undefined;
    await act(async () => { saved = await editor.save(); });
    known.mockRestore();
    expect(saved).toBe(false);
    expect(editor.error).toBe("SLUG_RESERVED");
    expect(editor.slugError).toBe("SLUG_RESERVED");
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ title: "Title kept" }));
    expect(api.updatePostMetadata.mock.lastCall?.[1]).not.toHaveProperty("slug");
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [{ type: "PARAGRAPH", content: "Body kept" }], {});
  });

  it("holds publishing until the slug is long enough", async () => {
    await mount();
    await act(async () => { editor.setSlug("a"); });
    let published: boolean | undefined;
    await act(async () => { published = await editor.changeStatus("publish"); });
    expect(published).toBe(false);
    expect(editor.error).toBe("slugInvalid");
    expect(api.publishPost).not.toHaveBeenCalled();
  });
});

describe("a scheduled post keeps its title", () => {
  it("refuses to save the title empty, since the scheduled publish would fail", async () => {
    api.getPost.mockResolvedValue({ ...POST, status: "SCHEDULED", scheduledAt: "2099-01-01T00:00:00Z" });
    await mount();
    await act(async () => { editor.setTitle("   "); });
    let saved: boolean | undefined;
    await act(async () => { saved = await editor.save(); });
    expect(saved).toBe(false);
    expect(editor.error).toBe("scheduledTitleRequired");
    expect(api.updatePostMetadata).not.toHaveBeenCalled();
  });

  it("still lets a scheduled post with no title go back to draft, saving the edits first", async () => {
    api.getPost.mockResolvedValue({ ...POST, title: "", status: "SCHEDULED", scheduledAt: "2099-01-01T00:00:00Z" });
    api.backToDraftPost.mockResolvedValue({ ...POST, title: "", status: "DRAFT" });
    await mount();
    await act(async () => { editor.setMarkdown("Edited while scheduled"); });
    let cancelled: boolean | undefined;
    await act(async () => { cancelled = await editor.cancelSchedule(); });
    expect(cancelled).toBe(true);
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [{ type: "PARAGRAPH", content: "Edited while scheduled" }], {});
    expect(api.backToDraftPost).toHaveBeenCalledWith(16);
    expect(api.replaceBlocks.mock.invocationCallOrder[0]).toBeLessThan(api.backToDraftPost.mock.invocationCallOrder[0]);
  });
});

describe("saving against another device's edits", () => {
  const conflict = (version: number) =>
    new ApiError(409, { status: 409, code: "POST_EDIT_CONFLICT", contentVersion: version } as never);

  beforeEach(() => {
    window.localStorage.clear();
    api.getPost.mockResolvedValue({ ...POST, contentVersion: 9 });
    api.getBlocks.mockResolvedValue({ blocks: [], contentVersion: 7 });
    api.updatePostMetadata.mockImplementation(async (id, payload) => ({
      ...POST,
      id,
      ...payload,
      contentVersion: (payload.baseVersion ?? 0) + 1,
    }));
    api.replaceBlocks.mockImplementation(async (_id, blocks, guard) => ({
      blocks,
      contentVersion: (guard?.baseVersion ?? 0) + 1,
    }));
  });

  it("stands on the body's version and chains each write on the last answer", async () => {
    await mount();
    await act(async () => { editor.setTitle("First"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ baseVersion: 7 }));
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, expect.any(Array), { baseVersion: 8 });

    await act(async () => { editor.setTitle("Second"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ baseVersion: 9 }));
  });

  it("saves unchecked on a server that sends no version", async () => {
    api.getBlocks.mockResolvedValue({ blocks: [], contentVersion: null });
    api.updatePostMetadata.mockImplementation(async (id, payload) => ({ ...POST, id, ...payload }));
    api.replaceBlocks.mockResolvedValue({ blocks: [], contentVersion: null });
    await mount();
    await act(async () => { editor.setTitle("Old server"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata.mock.lastCall?.[1]).not.toHaveProperty("baseVersion");
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, expect.any(Array), {});
  });

  it("stops autosave and asks when another device saved in between", async () => {
    await mount();
    api.updatePostMetadata.mockRejectedValueOnce(conflict(8));
    api.getPost.mockResolvedValue({ ...POST, title: "Edited elsewhere", contentVersion: 8 });
    await act(async () => { editor.setTitle("Mine"); });
    let saved: boolean | undefined;
    await act(async () => { saved = await editor.save(); });
    expect(saved).toBe(false);
    expect(editor.conflict).toBe(true);
    expect(api.replaceBlocks).not.toHaveBeenCalled();

    api.updatePostMetadata.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(api.updatePostMetadata).not.toHaveBeenCalled();
  });

  it("overwrites on the one request it was asked for", async () => {
    await mount();
    api.updatePostMetadata.mockRejectedValueOnce(conflict(8));
    api.getPost.mockResolvedValue({ ...POST, title: "Edited elsewhere", contentVersion: 8 });
    await act(async () => { editor.setTitle("Mine"); });
    await act(async () => { await editor.save(); });

    let ok: boolean | undefined;
    await act(async () => { ok = await editor.overwriteMine(); });
    expect(ok).toBe(true);
    expect(editor.conflict).toBe(false);
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ baseVersion: 7, overwrite: true }));
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, expect.any(Array), { baseVersion: 8 });
  });

  it("keeps the writer's version on this device before taking the latest", async () => {
    await mount();
    api.updatePostMetadata.mockRejectedValueOnce(conflict(8));
    api.getPost.mockResolvedValue({ ...POST, title: "Edited elsewhere", contentVersion: 8 });
    api.getBlocks.mockResolvedValue({ blocks: [{ id: 1, type: "PARAGRAPH", content: "Theirs", blockOrder: 0 }], contentVersion: 8 });
    await act(async () => {
      editor.setTitle("Mine");
      editor.setMarkdown("My body");
    });
    await act(async () => { await editor.save(); });
    await act(async () => { await editor.loadLatest(); });

    expect(editor.conflict).toBe(false);
    expect(editor.title).toBe("Edited elsewhere");
    expect(editor.markdown).toBe("Theirs");
    expect(editor.kept).toMatchObject({ title: "Mine", markdown: "My body" });
    expect(JSON.parse(window.localStorage.getItem("kurl:editor-kept:16") ?? "null")).toMatchObject({ markdown: "My body" });

    await act(async () => { editor.setTitle("Edited again"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ baseVersion: 8 }));
  });

  it("restores the kept version over the latest and saves it on the latest's version", async () => {
    await mount();
    api.updatePostMetadata.mockRejectedValueOnce(conflict(8));
    api.getPost.mockResolvedValue({ ...POST, title: "Edited elsewhere", contentVersion: 8 });
    api.getBlocks.mockResolvedValue({ blocks: [{ id: 1, type: "PARAGRAPH", content: "Theirs", blockOrder: 0 }], contentVersion: 8 });
    await act(async () => {
      editor.setTitle("Mine");
      editor.setMarkdown("My body");
    });
    await act(async () => { await editor.save(); });
    await act(async () => { await editor.loadLatest(); });
    const remounts = editor.reloadKey;

    await act(async () => { editor.restoreKept(); });
    expect(editor.title).toBe("Mine");
    expect(editor.markdown).toBe("My body");
    expect(editor.reloadKey).toBe(remounts + 1);
    expect(editor.kept).toBeNull();
    expect(window.localStorage.getItem("kurl:editor-kept:16")).toBeNull();

    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ title: "Mine", baseVersion: 8 }));
    expect(api.replaceBlocks).toHaveBeenLastCalledWith(16, [{ type: "PARAGRAPH", content: "My body" }], { baseVersion: 9 });
  });

  it("counts a conflict with its own earlier write as saved", async () => {
    await mount();
    await act(async () => { editor.setTitle("Mine"); editor.setMarkdown("Same body"); });
    api.replaceBlocks.mockRejectedValueOnce(conflict(9));
    api.getPost.mockResolvedValue({ ...POST, title: "Mine", contentVersion: 9 });
    api.getBlocks.mockResolvedValue({ blocks: [{ id: 1, type: "paragraph", content: "Same body", blockOrder: 0 }], contentVersion: 9 });
    let saved: boolean | undefined;
    await act(async () => { saved = await editor.save(); });
    expect(saved).toBe(true);
    expect(editor.conflict).toBe(false);

    await act(async () => { editor.setTitle("Next"); });
    await act(async () => { await editor.save(); });
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ baseVersion: 9 }));
  });

  it("re-reads on return to the tab when another device saved and nothing here is unsaved", async () => {
    await mount();
    expect(api.getBlocks).toHaveBeenCalledTimes(1);
    api.getPost.mockResolvedValue({ ...POST, contentVersion: 8 });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(api.getBlocks).toHaveBeenCalledTimes(2);
    expect(editor.remoteReloads).toBe(1);

    await act(async () => { editor.setTitle("Unsaved"); });
    api.getPost.mockResolvedValue({ ...POST, contentVersion: 12 });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(api.getBlocks).toHaveBeenCalledTimes(2);
  });
});

describe("a post the writer may not make public", () => {
  const refused = (status: number, code: string) => new ApiError(status, { status, code } as never);

  it("marks the post taken down when making it public again is refused for that", async () => {
    api.getPost.mockResolvedValue({ ...POST, status: "UNPUBLISHED", publishedAt: "2026-01-02T00:00:00Z" });
    api.republishPost.mockRejectedValue(refused(409, "POST_TAKEN_DOWN"));
    await mount();
    let republished: boolean | undefined;
    await act(async () => { republished = await editor.changeStatus("republish"); });
    expect(republished).toBe(false);
    expect(editor.post?.takenDown).toBe(true);
    expect(editor.post?.status).toBe("UNPUBLISHED");
  });

  it("tells a suspended writer that drafts can still be written", async () => {
    api.publishPost.mockRejectedValue(refused(403, "ACCOUNT_SUSPENDED"));
    await mount();
    await act(async () => { await editor.changeStatus("publish"); });
    expect(editor.error).toBe("accountSuspendedPublic");
    expect(editor.post?.takenDown).toBeUndefined();
  });

  it("tells a restricted writer why the schedule was refused", async () => {
    api.schedulePost.mockRejectedValue(refused(403, "ACCOUNT_BANNED"));
    await mount();
    await act(async () => { await editor.schedule("2099-01-01T12:00"); });
    expect(editor.error).toBe("accountBannedPublic");
  });
});

describe("a save that fails", () => {
  it("says so until a retry lands, and the retry saves right away", async () => {
    await mount();
    api.updatePostMetadata.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => { editor.setTitle("Offline edit"); });
    await act(async () => { await editor.save(); });
    expect(editor.saveFailed).toBe(true);

    await act(async () => { await editor.retrySave(); });
    expect(editor.saveFailed).toBe(false);
    expect(api.updatePostMetadata).toHaveBeenLastCalledWith(16, expect.objectContaining({ title: "Offline edit" }));
  });
});

