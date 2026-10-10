import { describe, expect, it } from "vitest";
import { scheduledLabel } from "./scheduled-label";

describe("scheduledLabel", () => {
  const thisYear = new Date().getFullYear();

  it("reads month, day and minute on the Seoul clock, with no seconds", () => {
    const label = scheduledLabel(`${thisYear}-10-13T20:32:45Z`, "ko");
    expect(label).toContain("10월 14일");
    expect(label).toContain("05:32");
    expect(label).not.toContain(":45");
    expect(label).not.toContain(String(thisYear));
  });

  it("adds the year only for another year", () => {
    expect(scheduledLabel(`${thisYear + 1}-01-03T01:00:00Z`, "en")).toContain(String(thisYear + 1));
  });
});
