import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyMention, mentionTokenAt } from "./mention-token";

const mocks = vi.hoisted(() => ({ listMentionCandidates: vi.fn(), searchRemoteAccounts: vi.fn() }));
vi.mock("./api/mention-candidates", () => ({ listMentionCandidates: mocks.listMentionCandidates }));
vi.mock("@/modules/notes/api/federation-search", () => ({ searchRemoteAccounts: mocks.searchRemoteAccounts }));

import { useMentionCandidates } from "./use-mention-candidates";

let root: Root;
let host: HTMLDivElement;
let candidates: ReturnType<typeof useMentionCandidates>;

function Probe({ query, remote }: { query: string | null; remote?: boolean }) {
  candidates = useMentionCandidates(query, true, remote);
  return null;
}

const minji = { userId: 2, username: "minji", displayName: null, avatarUrl: null, following: true };
const mina = {
  id: 9800,
  acct: "mina@mastodon.social",
  username: "mina",
  domain: "mastodon.social",
  displayName: "Mina",
  avatarUrl: null,
  url: "https://mastodon.social/@mina",
  following: true,
  requested: false,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.listMentionCandidates.mockResolvedValue([minji]);
  mocks.searchRemoteAccounts.mockResolvedValue([mina]);
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function type(query: string | null, remote?: boolean) {
  await act(async () => root.render(<Probe query={query} remote={remote} />));
  await act(async () => vi.advanceTimersByTimeAsync(120));
}

describe("mention candidates on other servers", () => {
  it("adds a few accounts elsewhere after the people here, named by their full handle", async () => {
    await type("mi", true);
    expect(mocks.searchRemoteAccounts).toHaveBeenCalledWith("mi", 3);
    expect(candidates.map((c) => c.username)).toEqual(["minji", "mina@mastodon.social"]);
    expect(candidates[1]).toMatchObject({ remoteId: 9800, displayName: "Mina" });
  });

  it("asks nobody elsewhere where mentions do not reach other servers", async () => {
    await type("mi");
    expect(mocks.searchRemoteAccounts).not.toHaveBeenCalled();
    expect(candidates.map((c) => c.username)).toEqual(["minji"]);
  });

  it("leaves out accounts the viewer blocked, alone or by server", async () => {
    mocks.searchRemoteAccounts.mockResolvedValue([
      { ...mina, blocking: true },
      { ...mina, id: 9801, acct: "mio@misskey.io", domainBlocked: true },
    ]);
    await type("mi", true);
    expect(candidates.map((c) => c.username)).toEqual(["minji"]);
  });

  it("keeps the people here when the search elsewhere fails or the backend lacks it", async () => {
    mocks.searchRemoteAccounts.mockResolvedValue(null);
    await type("mi", true);
    expect(candidates.map((c) => c.username)).toEqual(["minji"]);
  });

  it("clears both once the mention is finished", async () => {
    await type("mi", true);
    await type(null, true);
    expect(candidates).toEqual([]);
  });

  it("puts the full handle in when an account elsewhere is picked", () => {
    const token = mentionTokenAt("hi @mi", 6)!;
    expect(applyMention("hi @mi", token, 6, "mina@mastodon.social")).toEqual({
      text: "hi @mina@mastodon.social ",
      caret: 25,
    });
  });
});
