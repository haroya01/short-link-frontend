import { beforeEach, describe, expect, it } from "vitest";
import { consumePublishCelebration, stampPublishCelebration } from "./celebrate-publish";

describe("celebrate-publish session contract", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stamp → consume for the same slug plays exactly once", () => {
    stampPublishCelebration("my-post");
    expect(consumePublishCelebration("my-post")).toBe(true);
    // Consumed — a refresh / back-forward must not replay.
    expect(consumePublishCelebration("my-post")).toBe(false);
  });

  it("a different post never consumes another post's flag", () => {
    stampPublishCelebration("my-post");
    expect(consumePublishCelebration("other-post")).toBe(false);
    // The original target still gets its celebration on arrival.
    expect(consumePublishCelebration("my-post")).toBe(true);
  });

  it("no flag → no celebration", () => {
    expect(consumePublishCelebration("my-post")).toBe(false);
  });
});
