import { describe, expect, it } from "vitest";
import { markdownLead } from "./markdown-lead";

describe("markdownLead", () => {
  it("reads soft line breaks as spaces, not as a backslash", () => {
    expect(markdownLead("첫 줄\\\n둘째 줄\n\n다음 문단")).toBe("첫 줄 둘째 줄");
  });

  it("shows a pasted address as the address, without the angle brackets", () => {
    expect(markdownLead("자세한 건 <https://example.com/keep> 에서")).toBe("자세한 건 https://example.com/keep 에서");
  });

  it("keeps a link's words and drops its target", () => {
    expect(markdownLead("Read [the docs](https://kurl.me/AbC123) first")).toBe("Read the docs first");
  });

  it("skips headings and images before the first prose", () => {
    expect(markdownLead("# Title\n\n![cover](https://x.test/a.png)\n\nOpening line.")).toBe("Opening line.");
  });
});
