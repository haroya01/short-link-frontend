import { beforeEach, describe, expect, it, vi } from "vitest";
import { editNote, getNoteThread, listNoteRepliesAfter } from "./notes";

const client = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(public status: number) {
      super(`HTTP ${status}`);
    }
  }
  return { request: vi.fn(), ApiError };
});
vi.mock("@/lib/api/client", () => client);
vi.mock("@/modules/blog/api/public-posts", () => ({ fetchPublic: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  client.request.mockResolvedValue({});
});

describe("editing a note", () => {
  it("sends the content warning and the sensitive mark with the body", async () => {
    await editNote(5, { body: "결말 이야기", contentWarning: "스포일러", sensitive: true });
    expect(client.request).toHaveBeenCalledWith("/api/v1/notes/5", {
      method: "PATCH",
      body: { body: "결말 이야기", contentWarning: "스포일러", sensitive: true },
    });
  });

  it("sends an empty warning to take one off", async () => {
    await editNote(5, { body: "이제 괜찮아요", contentWarning: "", sensitive: false });
    expect(client.request.mock.lastCall?.[1].body).toEqual({
      body: "이제 괜찮아요",
      contentWarning: "",
      sensitive: false,
    });
  });
});

describe("a thread's replies in pages", () => {
  it("asks the thread for its first replies only when told how many", async () => {
    await getNoteThread(3, 20);
    expect(client.request).toHaveBeenLastCalledWith("/api/v1/public/notes/3?replies=20", { method: "GET" });
    await getNoteThread(3);
    expect(client.request).toHaveBeenLastCalledWith("/api/v1/public/notes/3", { method: "GET" });
  });

  it("reads replies after a cursor, and an empty next as the end", async () => {
    client.request.mockResolvedValue({ items: [], next: "", latest: "9", continued: false, total: 41 });
    expect(await listNoteRepliesAfter(3, "8")).toEqual({ items: [], next: null, latest: "9", continued: false, total: 41 });
    expect(client.request).toHaveBeenLastCalledWith("/api/v1/public/notes/3/replies?after=8&limit=20", { method: "GET" });
  });

  it("answers null when the server has no replies path yet, so the thread falls back", async () => {
    client.request.mockRejectedValueOnce(new client.ApiError(404));
    expect(await listNoteRepliesAfter(3, "8")).toBeNull();
    client.request.mockRejectedValueOnce(new client.ApiError(500));
    await expect(listNoteRepliesAfter(3, "8")).rejects.toThrow("HTTP 500");
  });
});
