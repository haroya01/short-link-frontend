import { describe, expect, it } from "vitest";
import { followCountTotals, followEntries, followEntryKey } from "./follows";

const local = { type: "local", id: 1, username: "haneul", bio: null, avatarUrl: null, followerCount: 3, followedByMe: true };
const account = {
  id: 1,
  acct: "ren@mastodon.online",
  username: "ren",
  domain: "mastodon.online",
  displayName: "Ren",
  avatarUrl: null,
  url: "https://mastodon.online/@ren",
  following: false,
  requested: false,
};

describe("followEntries", () => {
  it("keeps kurl members and accounts on other servers in the order the server sent them", () => {
    const entries = followEntries([{ type: "remote", account }, local]);
    expect(entries.map((e) => e.type)).toEqual(["remote", "local"]);
    expect(entries[0]).toEqual({ type: "remote", account });
    expect(entries[1]).toEqual(local);
  });

  it("drops an entry it cannot draw instead of sending it to a broken profile", () => {
    expect(followEntries([{ type: "group", id: 2 }, { type: "remote" }, { id: 3, username: "x" }, null, local])).toEqual([local]);
  });

  it("keys a kurl member and a remote account with the same id apart", () => {
    const [remote, member] = followEntries([{ type: "remote", account }, local]);
    expect(followEntryKey(remote)).not.toBe(followEntryKey(member));
  });
});

describe("followCountTotals", () => {
  it("adds accepted follows on other servers to each kurl count", () => {
    expect(
      followCountTotals({
        following: false,
        followerCount: 128,
        followingCount: 12,
        remoteFollowerCount: 1,
        remoteFollowingCount: 2,
        hideFollowerCount: false,
      }),
    ).toEqual({ followers: 129, following: 14 });
  });

  it("shows the kurl counts alone when the server does not send remote counts", () => {
    expect(followCountTotals({ following: false, followerCount: 128, followingCount: 12, hideFollowerCount: false })).toEqual({
      followers: 128,
      following: 12,
    });
  });

  it("has no numbers for an author who hides them", () => {
    expect(followCountTotals({ following: false, hideFollowerCount: true })).toBeNull();
    expect(followCountTotals({ following: false, followerCount: 1, followingCount: 1, remoteFollowingCount: 2, hideFollowerCount: true })).toBeNull();
  });
});
