import { describe, expect, it } from "vitest";
import { normalizeSlugInput, slugForSave } from "./slug";

const BACKEND_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("slug normalization", () => {
  it("the reported case saves as a backend-valid slug (no repeated/trailing hyphens)", () => {
    const saved = slugForSave("QA Slug ... 한글 symbols!");
    expect(saved).toBe("qa-slug-symbols");
    expect(saved).toMatch(BACKEND_SLUG);
  });

  it("collapses runs and drops a leading hyphen during input", () => {
    expect(normalizeSlugInput("!! Hello   World !!")).toBe("hello-world-");
    expect(normalizeSlugInput("---a")).toBe("a");
  });

  it("keeps a trailing hyphen while typing so 'a-' can become 'a-b'", () => {
    expect(normalizeSlugInput("a-")).toBe("a-");
    expect(normalizeSlugInput("a-b")).toBe("a-b");
  });

  it("slugForSave trims the trailing hyphen", () => {
    expect(slugForSave("a-")).toBe("a");
    expect(slugForSave("my-post-")).toBe("my-post");
  });
});
