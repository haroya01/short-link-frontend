import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import vi from "@/messages/vi.json";
import { REASON_CODES, actionRequiresExpiry } from "./abuse-report-reasons";
import type { AbuseAction, AbuseSubjectType } from "./abuse-reports";

/**
 * The moderation surfaces (report form + admin queue) look up copy by the backend's structured codes:
 * `reasonCode` → `reasons.<CODE>`, the resolve `action` → `action.<ACTION>`, and the new resolve error
 * codes → `errors.<CODE>`. A missing key would render a raw enum token to a user or moderator, so every
 * code must resolve to a non-empty string in all five locales, and the reason labels must stay identical
 * across the report form and the queue.
 */
const LOCALES = { en, ko, ja, vi, hi } as const;

const ENFORCEMENT_ACTIONS = Object.keys({
  UNPUBLISH_POST: true,
  DELETE_COMMENT: true,
  SUSPEND_USER: true,
  BAN_USER: true,
  DELETE_NOTE: true,
  DELETE_HIGHLIGHT_REPLY: true,
} satisfies Record<AbuseAction, true>) as AbuseAction[];

const SUBJECT_TYPES = Object.keys({
  POST: true,
  USER: true,
  COMMENT: true,
  NOTE: true,
  HIGHLIGHT_REPLY: true,
} satisfies Record<AbuseSubjectType, true>) as AbuseSubjectType[];

const RESOLVE_ERROR_CODES = [
  "DUPLICATE_REPORT",
  "SUBJECT_NOT_FOUND",
  "SUSPEND_REQUIRES_EXPIRY",
];

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

describe("abuse-report i18n coverage", () => {
  for (const [name, dict] of Object.entries(LOCALES)) {
    describe(name, () => {
      const publicPost = (dict as { publicPost: { reasons: Record<string, string> } }).publicPost;
      const abuse = (dict as {
        abuseReports: {
          reasons: Record<string, string>;
          action: Record<string, string>;
          actionConfirm: Record<string, string>;
          subjectType: Record<string, string>;
          suspendDaysPrompt: string;
          suspendDaysInvalid: string;
        };
      }).abuseReports;
      const errors = (dict as { errors: Record<string, string> }).errors;

      for (const code of REASON_CODES) {
        it(`labels reason ${code} in the report form and the queue, identically`, () => {
          expect(nonEmptyString(publicPost.reasons[code])).toBe(true);
          expect(nonEmptyString(abuse.reasons[code])).toBe(true);
          expect(abuse.reasons[code]).toBe(publicPost.reasons[code]);
        });
      }

      for (const action of ENFORCEMENT_ACTIONS) {
        it(`labels enforcement action ${action}`, () => {
          expect(nonEmptyString(abuse.action[action])).toBe(true);
        });
      }

      for (const type of SUBJECT_TYPES) {
        it(`labels subject type ${type}`, () => {
          expect(nonEmptyString(abuse.subjectType[type])).toBe(true);
        });
      }

      it("keeps a confirm prompt for every action but suspend, which asks for days instead", () => {
        for (const action of ENFORCEMENT_ACTIONS.filter((a) => !actionRequiresExpiry(a))) {
          expect(nonEmptyString(abuse.actionConfirm[action]), action).toBe(true);
        }
        expect(nonEmptyString(abuse.suspendDaysPrompt)).toBe(true);
        expect(nonEmptyString(abuse.suspendDaysInvalid)).toBe(true);
      });

      for (const code of RESOLVE_ERROR_CODES) {
        it(`surfaces resolve error ${code}`, () => {
          expect(nonEmptyString(errors[code])).toBe(true);
        });
      }

      it("dropped the old takedown action/confirm keys", () => {
        expect(abuse.action).not.toHaveProperty("takedown");
        expect(dict as unknown).toBeTruthy();
      });
    });
  }
});
