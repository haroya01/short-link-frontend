import { describe, expect, it } from "vitest";
import { remoteQueryDomain } from "./remote-handle";

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
