import { describe, expect, it } from "vitest";

import {
  REASON_CODES,
  actionRequiresExpiry,
  availableActions,
  reasonLabelKey,
} from "./abuse-report-reasons";
import type { AbuseReasonCode } from "./abuse-reports";

describe("abuse report reasons", () => {
  it("exposes exactly the six #611 reason codes, spam first and other last", () => {
    expect([...REASON_CODES]).toEqual([
      "SPAM",
      "HARASSMENT",
      "VIOLENCE",
      "SEXUAL",
      "COPYRIGHT",
      "OTHER",
    ]);
  });

  it("keys each reason under report.reasons.<CODE>", () => {
    const code: AbuseReasonCode = "SPAM";
    expect(reasonLabelKey(code)).toBe("reasons.SPAM");
  });
});

describe("availableActions", () => {
  it("offers only unpublish for a post", () => {
    expect(availableActions("POST")).toEqual(["UNPUBLISH_POST"]);
  });

  it("offers only delete for a comment", () => {
    expect(availableActions("COMMENT")).toEqual(["DELETE_COMMENT"]);
  });

  it("offers suspend and ban for a user, suspend first", () => {
    expect(availableActions("USER")).toEqual(["SUSPEND_USER", "BAN_USER"]);
  });

  it("drops the takedown once the post/comment is already removed", () => {
    expect(availableActions("POST", { subjectRemoved: true })).toEqual([]);
    expect(availableActions("COMMENT", { subjectRemoved: true })).toEqual([]);
  });

  it("keeps suspend/ban available even after a user's content is gone", () => {
    expect(availableActions("USER", { subjectRemoved: true })).toEqual([
      "SUSPEND_USER",
      "BAN_USER",
    ]);
  });
});

describe("actionRequiresExpiry", () => {
  it("requires an expiry only for a suspension", () => {
    expect(actionRequiresExpiry("SUSPEND_USER")).toBe(true);
    expect(actionRequiresExpiry("BAN_USER")).toBe(false);
    expect(actionRequiresExpiry("UNPUBLISH_POST")).toBe(false);
    expect(actionRequiresExpiry("DELETE_COMMENT")).toBe(false);
  });
});
