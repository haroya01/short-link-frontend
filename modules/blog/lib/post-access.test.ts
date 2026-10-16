import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return import("./post-access");
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a post's key and grant", () => {
  it("go out only for the post they open", async () => {
    const access = await load();
    access.rememberPostKey(31, "k31");
    access.savePostGrant(31, "g31", new Date(Date.now() + 60_000).toISOString());
    expect(access.postAccessHeaders(31)).toEqual({ "X-Post-Key": "k31", "X-Post-Grant": "g31" });
    expect(access.postAccessHeaders(32)).toBeUndefined();
  });

  it("follow the post being read when a call is scoped by a comment or highlight id", async () => {
    const access = await load();
    access.rememberPostKey(31, "k31");
    expect(access.postAccessHeaders()).toEqual({ "X-Post-Key": "k31" });
  });

  it("keeps the grant for the tab only, and drops it once it expires", async () => {
    const access = await load();
    access.savePostGrant(5, "g5", new Date(Date.now() + 1_000).toISOString());
    expect(window.sessionStorage.getItem("kurl:post-grant:5")).toContain("g5");
    expect(window.localStorage.getItem("kurl:post-grant:5")).toBeNull();
    expect(access.readPostGrant(5)).toBe("g5");
    expect(access.readPostGrant(5, Date.now() + 2_000)).toBeNull();
    expect(window.sessionStorage.getItem("kurl:post-grant:5")).toBeNull();
  });

  it("is forgotten when the server says the grant no longer opens the post", async () => {
    const access = await load();
    access.savePostGrant(5, "g5", new Date(Date.now() + 60_000).toISOString());
    access.dropPostGrant(5);
    expect(access.postAccessHeaders(5)).toBeUndefined();
  });

  it("merges into the reader's own headers without dropping the token", async () => {
    const access = await load();
    access.rememberPostKey(9, "k9");
    expect(access.withPostAccess({ Authorization: "Bearer t" }, 9)).toEqual({ authorization: "Bearer t", "X-Post-Key": "k9" });
    expect(access.withPostAccess(undefined, 10)).toBeUndefined();
  });
});

describe("the referrer a view beacon reports", () => {
  it("loses the link key and keeps everything else", async () => {
    const { withoutPostKey } = await load();
    expect(withoutPostKey("https://blog.kurl.me/@hana/link-only-draft?k=secret&utm_source=x")).toBe(
      "https://blog.kurl.me/@hana/link-only-draft?utm_source=x",
    );
    expect(withoutPostKey("https://blog.kurl.me/@hana/open-letter")).toBe("https://blog.kurl.me/@hana/open-letter");
    expect(withoutPostKey("")).toBe("");
    expect(withoutPostKey("not a url")).toBe("not a url");
  });
});
