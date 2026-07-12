import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import vi from "@/messages/vi.json";
import { REASON_CODES } from "./abuse-report-reasons";
import type { AbuseAction } from "./abuse-reports";

/**
 * The moderation surfaces (report form + admin queue) look up copy by the backend's structured codes:
 * `reasonCode` → `reasons.<CODE>`, the resolve `action` → `action.<ACTION>`, and the new resolve error
 * codes → `errors.<CODE>`. A missing key would render a raw enum token to a user or moderator, so every
 * code must resolve to a non-empty string in all five locales, and the reason labels must stay identical
 * across the report form and the queue.
 */
const LOCALES = { en, ko, ja, vi, hi } as const;

const ENFORCEMENT_ACTIONS: AbuseAction[] = [
  "UNPUBLISH_POST",
  "DELETE_COMMENT",
  "SUSPEND_USER",
  "BAN_USER",
];

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

      it("keeps a confirm prompt for every destructive action (suspend uses a day prompt)", () => {
        for (const action of ["UNPUBLISH_POST", "DELETE_COMMENT", "BAN_USER"]) {
          expect(nonEmptyString(abuse.actionConfirm[action])).toBe(true);
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
