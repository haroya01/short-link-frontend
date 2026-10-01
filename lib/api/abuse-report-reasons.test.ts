import { describe, expect, it } from "vitest";

import {
  LINK_REASON_CODES,
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

  it("leads the link report with the harms of opening a link, other last", () => {
    expect([...LINK_REASON_CODES]).toEqual([
      "PHISHING",
      "MALWARE",
      "SPAM",
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

  it("offers only switching off for a link", () => {
    expect(availableActions("LINK")).toEqual(["DISABLE_LINK"]);
  });

  it("drops the takedown once the post/comment/link is already removed", () => {
    expect(availableActions("POST", { subjectRemoved: true })).toEqual([]);
    expect(availableActions("COMMENT", { subjectRemoved: true })).toEqual([]);
    expect(availableActions("LINK", { subjectRemoved: true })).toEqual([]);
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
    expect(actionRequiresExpiry("DISABLE_LINK")).toBe(false);
  });
});
