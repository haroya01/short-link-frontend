import { describe, expect, it } from "vitest";
import { oldHandleRedirect } from "./old-handle-redirect";

describe("oldHandleRedirect", () => {
  it("stays put when the requested handle is the current one, in any case", () => {
    expect(oldHandleRedirect("dohyun", "dohyun", "ko", {})).toBeNull();
    expect(oldHandleRedirect("DoHyun", "dohyun", "ko", {})).toBeNull();
  });

  it("sends an old handle to the current card path", () => {
    expect(oldHandleRedirect("dohyun_old", "dohyun", "ja", {})).toBe("/ja/u/dohyun");
  });

  it("carries the query over so the visit keeps its UTM", () => {
    const search = { utm_source: "instagram", utm_medium: "bio", tag: ["a", "b"], ref: "x&y" };
    expect(oldHandleRedirect("dohyun_old", "dohyun", "ko", search)).toBe(
      "/ko/u/dohyun?utm_source=instagram&utm_medium=bio&tag=a&tag=b&ref=x%26y",
    );
  });
});
