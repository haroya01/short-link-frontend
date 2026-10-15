import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  postImageErrorMessageKey,
  PostImageUploadError,
  postImageTypeError,
  uploadPostImage,
} from "./post-images";

const client = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => client);
vi.mock("@/lib/image-resize", () => ({ stripImageMetadata: async (file: File) => file }));

const photo = (type: string) => new File([new Uint8Array([1, 2, 3])], "photo", { type });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("post image formats", () => {
  it("accepts the four formats the server presigns", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(postImageTypeError(photo(type))).toBeNull();
    }
  });

  it("names a format the server refuses instead of failing on the generic upload error", () => {
    expect(postImageErrorMessageKey(postImageTypeError(photo("image/heic")))).toEqual({
      key: "uploadUnsupportedFormat",
      values: { format: "HEIC" },
    });
    expect(postImageErrorMessageKey(postImageTypeError(photo("image/svg+xml")))).toEqual({
      key: "uploadUnsupportedFormat",
      values: { format: "SVG" },
    });
    expect(postImageErrorMessageKey(postImageTypeError(photo("application/pdf")))).toEqual({
      key: "uploadNotImage",
    });
  });

  it("stops an AVIF before asking the server to presign it", async () => {
    await expect(uploadPostImage(16, photo("image/avif"))).rejects.toMatchObject({
      code: "unsupported-format",
      detail: { format: "AVIF" },
    });
    expect(client.request).not.toHaveBeenCalled();
  });

  it("still presigns a supported image", async () => {
    client.request.mockRejectedValueOnce(new PostImageUploadError("upload-failed"));
    await expect(uploadPostImage(16, photo("image/png"))).rejects.toBeInstanceOf(PostImageUploadError);
    expect(client.request).toHaveBeenCalledWith("/api/v1/posts/16/images/presign", {
      method: "POST",
      body: { contentType: "image/png" },
    });
  });
});
