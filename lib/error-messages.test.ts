import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import viMessages from "@/messages/vi.json";

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

// 글 쓰기·반응을 막는 게이트(작가 차단, 계정 정지·이용 제한)는 다시 해도 풀리지 않는다.
// 번역이 빠지면 "잠시 후 다시 시도해 주세요"로 떨어져 거짓 안내가 된다.
const WRITE_GATE_CODES = ["POST_INTERACTION_BLOCKED", "ACCOUNT_SUSPENDED", "ACCOUNT_BANNED"];

describe("write gate error code i18n", () => {
  for (const [name, dict] of Object.entries({ en, ko, ja, vi: viMessages, hi })) {
    for (const code of WRITE_GATE_CODES) {
      it(`${name} has errors.${code}`, () => {
        const errors = (dict as { errors: Record<string, string> }).errors;
        expect(errors[code]?.length ?? 0).toBeGreaterThan(0);
      });
    }
  }
});

describe("resolveErrorMessage", async () => {
  const { resolveErrorMessage } = await import("./error-messages");
  const { ApiError } = await import("./api");
  const catalog = {
    has: (code: string) => code in ko.errors,
    translate: (code: string) => (ko.errors as Record<string, string>)[code],
  };

  it("번역해 둔 코드는 그 문구", () => {
    const err = new ApiError(500, { title: "Internal Server Error", status: 500, detail: "internal server error", code: "INTERNAL_ERROR" });
    expect(resolveErrorMessage(err, "불러오지 못했어요", catalog)).toBe(ko.errors.INTERNAL_ERROR);
  });

  it("번역 없는 코드는 서버 영어 detail 대신 대체 문구", () => {
    const err = new ApiError(404, { title: "Not Found", status: 404, detail: "campaign not found", code: "CAMPAIGN_NOT_FOUND" });
    expect(resolveErrorMessage(err, "불러오지 못했어요", catalog)).toBe("불러오지 못했어요");
  });

  it("JS 오류 메시지(Failed to fetch 등)도 대체 문구", () => {
    expect(resolveErrorMessage(new TypeError("Failed to fetch"), "불러오지 못했어요", catalog)).toBe("불러오지 못했어요");
  });
});
