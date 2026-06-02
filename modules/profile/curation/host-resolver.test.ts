import { describe, expect, it } from "vitest";
import { createHostResolver } from "./host-resolver";

const PROVIDERS = [
  { id: "alpha", hosts: ["alpha.com", "www.alpha.com"], name: "Alpha" },
  { id: "beta", hosts: ["beta.io"], name: "Beta" },
] as const;

describe("createHostResolver", () => {
  const resolve = createHostResolver(PROVIDERS);

  it("matches a known host and returns the whole spec", () => {
    expect(resolve("https://alpha.com/abc")?.id).toBe("alpha");
    expect(resolve("https://www.alpha.com/x")?.id).toBe("alpha");
    expect(resolve("https://beta.io")?.id).toBe("beta");
  });

  it("is case-insensitive on the host and tolerates surrounding whitespace", () => {
    expect(resolve("  HTTPS://ALPHA.COM/Path  ")?.id).toBe("alpha");
  });

  it("returns null for an unknown host", () => {
    expect(resolve("https://gamma.net")).toBeNull();
  });

  it("returns null for empty, unparseable, or non-http(s) input", () => {
    expect(resolve("")).toBeNull();
    expect(resolve("not a url")).toBeNull();
    expect(resolve("ftp://alpha.com")).toBeNull();
    expect(resolve("javascript:alert(1)")).toBeNull();
  });

  it("does not match a host as a substring (exact host only)", () => {
    expect(resolve("https://alpha.com.evil.net")).toBeNull();
    expect(resolve("https://notalpha.com")).toBeNull();
  });
});
