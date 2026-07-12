import type { AbuseAction, AbuseReasonCode, AbuseSubjectType } from "./abuse-reports";

/**
 * The six report reasons, in the order shown in the submit form. Kept in lockstep with the iOS app's
 * {@code ReportReason} (kurl-ios AbuseReport.swift) so a moderator reading the queue sees the same
 * label whether the report came from web or native. The order is deliberate — spam first (most common),
 * "other" last (the escape hatch) — and drives both the radio group and the queue's code→label lookup.
 */
export const REASON_CODES: readonly AbuseReasonCode[] = [
  "SPAM",
  "HARASSMENT",
  "VIOLENCE",
  "SEXUAL",
  "COPYRIGHT",
  "OTHER",
] as const;

/** i18n key (under the `report.reasons` namespace) for a reason code's short label. */
export function reasonLabelKey(code: AbuseReasonCode): string {
  return `reasons.${code}`;
}

/**
 * The enforcement actions a moderator can attach when resolving a report, keyed by what was reported.
 * A POST report can be unpublished; a COMMENT deleted; a USER suspended (needs an expiry) or banned
 * (permanent). Resolving with no action — "reviewed, no violation" — is always allowed and handled by
 * the plain resolve buttons, so it isn't listed here.
 */
const ACTIONS_BY_SUBJECT: Record<AbuseSubjectType, readonly AbuseAction[]> = {
  POST: ["UNPUBLISH_POST"],
  COMMENT: ["DELETE_COMMENT"],
  USER: ["SUSPEND_USER", "BAN_USER"],
};

/** Actions offered for a subject type, minus any already applied (e.g. a post that's already removed). */
export function availableActions(
  subjectType: AbuseSubjectType,
  opts?: { subjectRemoved?: boolean },
): readonly AbuseAction[] {
  const actions = ACTIONS_BY_SUBJECT[subjectType] ?? [];
  if (opts?.subjectRemoved) {
    // Takedowns are idempotent from the queue's view: once the post is unpublished / comment deleted,
    // don't re-offer the destructive button. Suspend/ban stay available (a user can be sanctioned even
    // after their post is gone).
    return actions.filter((a) => a !== "UNPUBLISH_POST" && a !== "DELETE_COMMENT");
  }
  return actions;
}

/** SUSPEND_USER is the only action the backend rejects without an expiry (SUSPEND_REQUIRES_EXPIRY). */
export function actionRequiresExpiry(action: AbuseAction): boolean {
  return action === "SUSPEND_USER";
}
