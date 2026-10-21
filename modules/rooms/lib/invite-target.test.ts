import { describe, expect, it } from "vitest";
import { inviteTarget } from "./invite-target";

describe("reading what was pasted into 초대 링크로 들어가기", () => {
  it("takes the code out of an invite page address, with or without a locale", () => {
    expect(inviteTarget("https://kurl.me/rooms/join/r100x")).toEqual({ kind: "code", code: "r100x" });
    expect(inviteTarget("https://blog.kurl.me/ko/rooms/join/r100x?x=1")).toEqual({ kind: "code", code: "r100x" });
  });

  it("opens a kurl short link as it is, since only the server knows where it goes", () => {
    expect(inviteTarget("https://kurl.me/R100k")).toEqual({ kind: "url", url: "https://kurl.me/R100k" });
    expect(inviteTarget("kurl.me/R100k")).toEqual({ kind: "url", url: "https://kurl.me/R100k" });
  });

  it("refuses a link to somewhere else", () => {
    expect(inviteTarget("https://evil.example/R100k")).toBeNull();
    expect(inviteTarget("javascript:alert(1)")).toBeNull();
  });

  it("takes a bare code", () => {
    expect(inviteTarget("  r100x ")).toEqual({ kind: "code", code: "r100x" });
    expect(inviteTarget("")).toBeNull();
    expect(inviteTarget("a b")).toBeNull();
  });
});
