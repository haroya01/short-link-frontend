import { describe, expect, it } from "vitest";
import {
  handleBeingTyped,
  liveRemoteQueryDomain,
  looksLikeCompleteDomain,
  looksLikeRemoteHandle,
  normalizeRemoteQuery,
  remoteQueryDomain,
} from "./remote-handle";

describe("the server a search names", () => {
  it.each([
    ["@mina@mastodon.social", "mastodon.social"],
    ["mina@Mastodon.Social", "mastodon.social"],
    [" @kai@misskey.io ", "misskey.io"],
    ["https://mastodon.social/@mina/12", "mastodon.social"],
    ["https://Misskey.io/@kai", "misskey.io"],
  ])("reads %s as %s", (query, domain) => {
    expect(remoteQueryDomain(query)).toBe(domain);
  });

  it.each(["mina", "@mina", "http://mastodon.social/@mina", "https://localhost/@mina", "https://", "mina@", "two words"])(
    "names no server in %s",
    (query) => {
      expect(remoteQueryDomain(query)).toBeNull();
    },
  );
});

describe("cleaning a pasted handle", () => {
  it.each([
    ["  @mina@mastodon.social  ", "@mina@mastodon.social"],
    ["＠mina＠mastodon.social", "@mina@mastodon.social"],
    ["acct:mina@mastodon.social", "mina@mastodon.social"],
    ["ACCT:@mina@mastodon.social", "@mina@mastodon.social"],
    [" acct: ＠mina＠mastodon.social ", "@mina@mastodon.social"],
    ["https://mastodon.social/@mina", "https://mastodon.social/@mina"],
    ["mina", "mina"],
  ])("reads %j as %j", (raw, clean) => {
    expect(normalizeRemoteQuery(raw)).toBe(clean);
  });

  it("only strips acct: at the start", () => {
    expect(normalizeRemoteQuery("mina acct:x")).toBe("mina acct:x");
  });

  it.each(["＠mina＠mastodon.social", "acct:mina@mastodon.social", " acct:@mina@Mastodon.Social "])(
    "finds the handle and its server in %j",
    (raw) => {
      expect(looksLikeRemoteHandle(raw)).toBe(true);
      expect(remoteQueryDomain(raw)).toBe("mastodon.social");
    },
  );
});

describe("a server name that is finished being typed", () => {
  it.each(["mastodon.social", "misskey.io", "mstdn.jp", "social.example.co.uk", "my-server.social", "mastodon.social:8443"])(
    "%s is complete",
    (domain) => {
      expect(looksLikeCompleteDomain(domain)).toBe(true);
    },
  );

  it.each(["mastodon", "mastodon.", "mastodon.s", "mastodon.social-", "mastodon.so-", "-mastodon.social", "mastodon..social", "mastodon.123", ""])(
    "%j is not",
    (domain) => {
      expect(looksLikeCompleteDomain(domain)).toBe(false);
    },
  );

  it("asks while typing only once the handle's server is complete", () => {
    expect(liveRemoteQueryDomain("@a@mastodon.s")).toBeNull();
    expect(liveRemoteQueryDomain("@a@mastodon.so")).toBe("mastodon.so");
    expect(liveRemoteQueryDomain("＠a＠mastodon.social")).toBe("mastodon.social");
    expect(liveRemoteQueryDomain("https://mastodon.s/@a")).toBeNull();
    expect(liveRemoteQueryDomain("https://mastodon.social/@a/12")).toBe("mastodon.social");
    expect(liveRemoteQueryDomain("mina")).toBeNull();
  });
});

describe("a handle whose server is still being typed", () => {
  it.each([
    ["@gargron@", { user: "gargron", domain: "" }],
    ["@gargron@m", { user: "gargron", domain: "m" }],
    ["gargron@Mastodon.So", { user: "gargron", domain: "mastodon.so" }],
    [" ＠gargron＠mast ", { user: "gargron", domain: "mast" }],
    ["acct:@gargron@mastodon.social", { user: "gargron", domain: "mastodon.social" }],
  ])("reads %j", (query, typed) => {
    expect(handleBeingTyped(query)).toEqual(typed);
  });

  it.each(["gargron", "@gargron", "@gargron@mastodon social", "@a@b@c", "https://mastodon.social/@a", "@gar ron@m"])(
    "finds no handle in %j",
    (query) => {
      expect(handleBeingTyped(query)).toBeNull();
    },
  );
});
