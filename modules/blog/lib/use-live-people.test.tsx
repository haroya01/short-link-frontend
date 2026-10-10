import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchPeople: vi.fn() }));
vi.mock("@/modules/blog/api/people", async (original) => ({
  ...(await original<typeof import("@/modules/blog/api/people")>()),
  searchPeople: mocks.searchPeople,
}));

import { useLivePeople } from "./use-live-people";

let root: Root;
let host: HTMLDivElement;
let people: ReturnType<typeof useLivePeople>;

function Probe({ query }: { query: string }) {
  people = useLivePeople(query, true, 3);
  return null;
}

const person = (username: string) => ({
  username,
  displayName: null,
  avatarUrl: null,
  bio: null,
  followerCount: 0,
  following: false,
  requested: false,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
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

async function type(query: string) {
  await act(async () => root.render(<Probe query={query} />));
  await act(async () => vi.advanceTimersByTimeAsync(250));
}

describe("useLivePeople", () => {
  it("waits for two characters before asking", async () => {
    await type("@m");
    expect(mocks.searchPeople).not.toHaveBeenCalled();
    expect(people).toEqual([]);
  });

  it("shows the first few matches once typing settles", async () => {
    mocks.searchPeople.mockResolvedValue({ items: [person("minji")], page: 0, size: 3, hasNext: false });
    await type("min");
    expect(mocks.searchPeople).toHaveBeenCalledWith("min", 0, 3);
    expect(people.map((p) => p.username)).toEqual(["minji"]);
  });

  it("keeps quiet when the search fails, so the posts below still read", async () => {
    mocks.searchPeople.mockRejectedValue(new Error("down"));
    await type("min");
    expect(people).toEqual([]);
  });
});
