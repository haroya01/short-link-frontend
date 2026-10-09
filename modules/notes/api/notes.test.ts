import { beforeEach, describe, expect, it, vi } from "vitest";
import { editNote } from "./notes";

const client = vi.hoisted(() => ({ request: vi.fn() }));
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
