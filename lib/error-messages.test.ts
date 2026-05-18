import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";

/**
 * Backend exception handlers ship these codes in the ProblemDetail `code` field. The webhook
 * UI's only path to surface "why did register fail?" goes through useApiErrorMessage(), which
 * looks for `errors.<CODE>` in the active locale. Missing keys collapse to the generic
 * "Failed to register webhook." fallback, hiding the real reason.
 */
const REQUIRED_ERROR_CODES = [
  "INVALID_WEBHOOK_URL",
  "TOO_MANY_WEBHOOKS",
  "WEBHOOK_NOT_FOUND",
];

const LOCALES = { en, ko, ja } as const;

describe("webhook error code i18n", () => {
  for (const [name, dict] of Object.entries(LOCALES)) {
    describe(name, () => {
      for (const code of REQUIRED_ERROR_CODES) {
        it(`has errors.${code}`, () => {
          const errors = (dict as { errors: Record<string, string> }).errors;
          expect(errors[code]).toBeTypeOf("string");
          expect(errors[code]?.length ?? 0).toBeGreaterThan(0);
        });
      }
    });
  }
});
