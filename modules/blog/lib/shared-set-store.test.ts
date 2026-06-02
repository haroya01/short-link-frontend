import { describe, expect, it, vi } from "vitest";
import { createSharedSetStore } from "./shared-set-store";

/**
 * Characterizes the shared set-store semantics that the bookmark + series-subscription hooks rely on:
 * a single load, sign-out reset, optimistic toggle with rollback, and a fresh snapshot reference on
 * every change (the contract {@code useSyncExternalStore} needs to detect updates).
 */
describe("createSharedSetStore", () => {
  it("loads members once and publishes a fresh snapshot", async () => {
    const load = vi.fn(async () => ["a/1", "b/2"]);
    const store = createSharedSetStore<string>(load);
    const before = store.getSnapshot();

    await store.ensureLoaded();

    expect(load).toHaveBeenCalledTimes(1);
    const after = store.getSnapshot();
    expect(after).not.toBe(before); // new reference so subscribers re-render
    expect([...after]).toEqual(["a/1", "b/2"]);
  });

  it("does not re-load once ready", async () => {
    const load = vi.fn(async () => [1, 2]);
    const store = createSharedSetStore<number>(load);
    await store.ensureLoaded();
    await store.ensureLoaded();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("stays idle (retryable) when load rejects", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([7]);
    const store = createSharedSetStore<number>(load);

    await store.ensureLoaded();
    expect([...store.getSnapshot()]).toEqual([]);

    await store.ensureLoaded(); // retry succeeds
    expect([...store.getSnapshot()]).toEqual([7]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("notifies subscribers on change and stops after unsubscribe", async () => {
    const store = createSharedSetStore<number>(async () => [1]);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    await store.ensureLoaded();
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.reset();
    expect(listener).toHaveBeenCalledTimes(1); // no further calls after unsubscribe
  });

  it("reset clears the set, notifies, and allows a fresh load", async () => {
    const load = vi.fn(async () => [1, 2]);
    const store = createSharedSetStore<number>(load);
    const listener = vi.fn();
    store.subscribe(listener);
    await store.ensureLoaded();

    store.reset();
    expect([...store.getSnapshot()]).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2); // load + reset

    await store.ensureLoaded(); // status was reset to idle → loads again
    expect([...store.getSnapshot()]).toEqual([1, 2]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  describe("optimisticToggle", () => {
    it("adds a missing key immediately and tells mutate it was absent", async () => {
      const store = createSharedSetStore<number>(async () => []);
      await store.ensureLoaded();
      const mutate = vi.fn(async () => {});

      await store.optimisticToggle(5, mutate);

      expect(mutate).toHaveBeenCalledWith(false);
      expect(store.getSnapshot().has(5)).toBe(true);
    });

    it("removes a present key immediately and tells mutate it was present", async () => {
      const store = createSharedSetStore<number>(async () => [5]);
      await store.ensureLoaded();
      const mutate = vi.fn(async () => {});

      await store.optimisticToggle(5, mutate);

      expect(mutate).toHaveBeenCalledWith(true);
      expect(store.getSnapshot().has(5)).toBe(false);
    });

    it("rolls an add back when mutate rejects", async () => {
      const store = createSharedSetStore<number>(async () => []);
      await store.ensureLoaded();

      await store.optimisticToggle(9, async () => {
        throw new Error("nope");
      });

      expect(store.getSnapshot().has(9)).toBe(false); // rolled back
    });

    it("rolls a remove back when mutate rejects", async () => {
      const store = createSharedSetStore<number>(async () => [9]);
      await store.ensureLoaded();

      await store.optimisticToggle(9, async () => {
        throw new Error("nope");
      });

      expect(store.getSnapshot().has(9)).toBe(true); // restored
    });
  });
});
