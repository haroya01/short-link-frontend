import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const toast = vi.fn();
const createPost = vi.fn();
const replaceBlocks = vi.fn();
const updatePostMetadata = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/modules/blog/api/posts", () => ({
  createPost: (...args: unknown[]) => createPost(...args),
  replaceBlocks: (...args: unknown[]) => replaceBlocks(...args),
  updatePostMetadata: (...args: unknown[]) => updatePostMetadata(...args),
}));

import { ImportMdButton, parseImport } from "./import-md-button";

let root: Root;
let host: HTMLDivElement;
let nextId = 0;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  nextId = 0;
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  createPost.mockImplementation(async ({ slug }: { slug: string }) => {
    if (slug === "taken") throw new ApiError(409, { status: 409, code: "SLUG_CONFLICT" });
    return { id: ++nextId, slug };
  });
  replaceBlocks.mockResolvedValue(undefined);
  updatePostMetadata.mockResolvedValue(undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const md = (slug: string) => `---\ntitle: 옮겨 온 글\nslug: ${slug}\n---\n본문`;

async function importFiles(files: { name: string; raw: string }[]) {
  await act(async () => root.render(<ImportMdButton />));
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files.map((f) => ({ name: f.name, text: async () => f.raw })),
  });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}

describe("reading a frontmatter slug", () => {
  it("keeps a slug the backend takes as written, case aside", () => {
    expect(parseImport("a.md", md("velog-moved-post")).slug).toBe("velog-moved-post");
    expect(parseImport("a.md", md('"Moved-Post"')).slug).toBe("moved-post");
  });

  it("drops a slug it would have to rewrite, or none at all", () => {
    expect(parseImport("a.md", md("리액트-훅")).slug).toBeNull();
    expect(parseImport("a.md", md("my_post")).slug).toBeNull();
    expect(parseImport("a.md", md("a")).slug).toBeNull();
    expect(parseImport("a.md", md("x".repeat(201))).slug).toBeNull();
    expect(parseImport("a.md", "# 제목\n본문").slug).toBeNull();
  });
});

describe("importing .md files", () => {
  it("uses each free frontmatter slug, falls back to a random one when taken, and says how many came in", async () => {
    await importFiles([
      { name: "one.md", raw: md("velog-moved-post") },
      { name: "two.md", raw: md("taken") },
      { name: "three.md", raw: "# 세 번째\n본문" },
    ]);
    const slugs = createPost.mock.calls.map(([payload]) => (payload as { slug: string }).slug);
    expect(slugs[0]).toBe("velog-moved-post");
    expect(slugs[1]).toBe("taken");
    expect(slugs[2]).toMatch(/^draft-[a-z0-9]+$/);
    expect(slugs[3]).toMatch(/^draft-[a-z0-9]+$/);
    expect(slugs).toHaveLength(4);
    expect(toast).toHaveBeenCalledWith('importDone:{"count":3}', "success");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it("counts only the files that made it, beside the partial-failure note", async () => {
    replaceBlocks.mockRejectedValueOnce(new Error("blocks 500"));
    await importFiles([
      { name: "one.md", raw: md("first-post") },
      { name: "two.md", raw: md("second-post") },
    ]);
    expect(toast).toHaveBeenCalledWith('importDone:{"count":1}', "success");
    expect(host.querySelector('[role="alert"]')!.textContent).toBe("importPartialError");
  });

  it("says nothing went in when every file failed", async () => {
    createPost.mockRejectedValue(new Error("create 500"));
    await importFiles([{ name: "one.md", raw: md("first-post") }]);
    expect(toast).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });
});
