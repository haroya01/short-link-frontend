import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAccountFavorites } from "./link-favorites-migration";
import { getFavoriteLinks, resolveOwnedLinks, setLinkFavorite } from "./api/link-library";
import type { MyLink } from "@/types";

vi.mock("./api/link-library", () => ({ getFavoriteLinks: vi.fn(), resolveOwnedLinks: vi.fn(), setLinkFavorite: vi.fn() }));
const row = (shortCode: string) => ({ shortCode } as MyLink);
const page = (...codes: string[]) => ({ items: codes.map(row), hasMore: false, nextCursor: null });
beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); vi.mocked(setLinkFavorite).mockResolvedValue(); });

describe("legacy favorite migration", () => {
  it("imports only owner-validated links, preserves server favorites, and runs once per account", async () => {
    localStorage.setItem("kurl:link-favorites", JSON.stringify(["old", "old", "someone-elses", "existing"]));
    vi.mocked(getFavoriteLinks).mockResolvedValueOnce(page("existing")).mockResolvedValue(page("existing", "old"));
    vi.mocked(resolveOwnedLinks).mockResolvedValue(page("old", "existing"));
    expect((await loadAccountFavorites(7)).items.map((item) => item.shortCode)).toEqual(["existing", "old"]);
    expect(setLinkFavorite).toHaveBeenCalledTimes(1);
    expect(setLinkFavorite).toHaveBeenCalledWith("old", true, undefined);
    await loadAccountFavorites(7);
    expect(resolveOwnedLinks).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("kurl:link-favorites:migrated:7")).toBe("1");
  });
  it("does not mark failed migrations complete and safely resumes idempotent work", async () => {
    localStorage.setItem("kurl:link-favorites", JSON.stringify(["a", "b"]));
    vi.mocked(getFavoriteLinks).mockResolvedValueOnce(page()).mockResolvedValueOnce(page("a")).mockResolvedValue(page("a", "b"));
    vi.mocked(resolveOwnedLinks).mockResolvedValue(page("a", "b"));
    vi.mocked(setLinkFavorite).mockResolvedValueOnce().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce();
    await expect(loadAccountFavorites(1)).rejects.toThrow("offline");
    expect(localStorage.getItem("kurl:link-favorites:migrated:1")).toBeNull();
    await loadAccountFavorites(1);
    expect(vi.mocked(setLinkFavorite).mock.calls.map(([code]) => code)).toEqual(["a", "b", "b"]);
  });
  it("validates again for a different account and never copies a previous account's favorites", async () => {
    localStorage.setItem("kurl:link-favorites", JSON.stringify(["a", "b"]));
    localStorage.setItem("kurl:link-favorites:migrated:1", "1");
    vi.mocked(getFavoriteLinks).mockResolvedValue(page());
    vi.mocked(resolveOwnedLinks).mockResolvedValue(page("b"));
    await loadAccountFavorites(2);
    expect(setLinkFavorite).toHaveBeenCalledTimes(1);
    expect(setLinkFavorite).toHaveBeenCalledWith("b", true, undefined);
  });
  it("stops a canceled account query before importing or marking completion", async () => {
    const abort = new AbortController();
    vi.mocked(getFavoriteLinks).mockImplementation(async () => { abort.abort(); return page(); });
    await expect(loadAccountFavorites(1, abort.signal)).rejects.toThrow();
    expect(resolveOwnedLinks).not.toHaveBeenCalled();
    expect(setLinkFavorite).not.toHaveBeenCalled();
    expect(localStorage.getItem("kurl:link-favorites:migrated:1")).toBeNull();
  });
});
