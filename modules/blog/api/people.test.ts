import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ request: mocks.request, mockFailure: () => null }));

import { peopleQuery, searchPeople, searchablePeopleQuery } from "./people";

beforeEach(() => {
  mocks.request.mockReset();
  mocks.request.mockResolvedValue({ items: [], page: 0, size: 20, hasNext: false });
});

describe("people query", () => {
  it("reads a query the way the server does: trimmed, one @ dropped, cut at 30 characters", () => {
    expect(peopleQuery("  @Minji ")).toBe("Minji");
    expect(peopleQuery("@ 하루")).toBe("하루");
    expect(peopleQuery("😀".repeat(40))).toBe("😀".repeat(30));
  });

  it("needs two characters after the @", () => {
    expect(searchablePeopleQuery("@m")).toBe(false);
    expect(searchablePeopleQuery("가")).toBe(false);
    expect(searchablePeopleQuery("😀😀")).toBe(true);
    expect(searchablePeopleQuery("@mi")).toBe(true);
  });
});

describe("searchPeople", () => {
  it("answers a short query with an empty page without asking the server", async () => {
    await expect(searchPeople(" @k ", 0, 20)).resolves.toEqual({ items: [], page: 0, size: 20, hasNext: false });
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("asks the public search with the cleaned query, page and size", async () => {
    await searchPeople("@하루 카", 2, 10);
    expect(mocks.request).toHaveBeenCalledWith(
      `/api/v1/public/users/search?q=${encodeURIComponent("하루 카").replace(/%20/g, "+")}&page=2&size=10`,
      { method: "GET" },
    );
  });
});
