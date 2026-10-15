import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import { IMPORT_PLATFORMS } from "@/modules/blog/api/imports";
import { importErrorKey, importStep, progressPercent, syncErrorKey, withQuery } from "./import-flow";

const apiError = (status: number, code?: string) => new ApiError(status, { status, code });

describe("import flow", () => {
  it("puts a source on the step its status calls for", () => {
    expect(importStep({ status: "PENDING_VERIFICATION" })).toBe("verify");
    expect(importStep({ status: "IMPORTING" })).toBe("progress");
    expect(importStep({ status: "SYNCING" })).toBe("done");
    expect(importStep({ status: "ERROR" })).toBe("error");
    expect(importStep({ status: "DISCONNECTED" })).toBe("error");
  });

  it("names each contract error by its code, a 429 by its status, and the rest generically", () => {
    expect(importErrorKey(apiError(400, "IMPORT_UNSUPPORTED_SOURCE"))).toBe("errorUnsupported");
    expect(importErrorKey(apiError(404, "IMPORT_FEED_NOT_FOUND"))).toBe("errorFeedNotFound");
    expect(importErrorKey(apiError(502, "IMPORT_SOURCE_UNREACHABLE"))).toBe("errorUnreachable");
    expect(importErrorKey(apiError(409, "IMPORT_SOURCE_TAKEN"))).toBe("errorTaken");
    expect(importErrorKey(apiError(422, "IMPORT_VERIFICATION_CODE_MISSING"))).toBe("errorCodeMissing");
    expect(importErrorKey(apiError(429))).toBe("errorRateLimited");
    expect(importErrorKey(apiError(404))).toBe("errorGeneric");
    expect(importErrorKey(new Error("boom"))).toBe("errorGeneric");
  });

  it("reads a sync error code and falls back for anything it doesn't know", () => {
    expect(syncErrorKey("IMPORT_SOURCE_UNREACHABLE")).toBe("syncUnreachable");
    expect(syncErrorKey("IMPORT_FEED_NOT_FOUND")).toBe("syncFeedNotFound");
    expect(syncErrorKey("IMPORT_SOURCE_TAKEN")).toBe("errorSync");
    expect(syncErrorKey("connect timed out")).toBe("errorSync");
    expect(syncErrorKey(null)).toBe("errorSync");
  });

  it("caps progress at the whole and survives an empty total", () => {
    expect(progressPercent({ total: 12, done: 4, failed: 0 })).toBe(33);
    expect(progressPercent({ total: 12, done: 13, failed: 0 })).toBe(100);
    expect(progressPercent({ total: 0, done: 0, failed: 0 })).toBe(0);
    expect(progressPercent(null)).toBe(0);
  });

  it("keeps one piece of state in the address at a time", () => {
    const base = "https://blog.kurl.me/import?url=a.tistory.com&ref=x";
    expect(withQuery(base, "source", "9")).toBe("https://blog.kurl.me/import?ref=x&source=9");
    expect(withQuery(base, "url", null)).toBe("https://blog.kurl.me/import?ref=x");
  });

  it("has a name and a bio location for every platform in ko, en and ja", () => {
    for (const catalog of [ko, en, ja]) {
      for (const platform of IMPORT_PLATFORMS) {
        expect(catalog.blogImport.platform[platform]).toBeTruthy();
        expect(catalog.blogImport.where[platform]).toBeTruthy();
      }
    }
  });

  it("has copy for every error key the flow can produce", () => {
    const keys = [
      "errorUnsupported",
      "errorFeedNotFound",
      "errorUnreachable",
      "errorTaken",
      "errorCodeMissing",
      "errorRateLimited",
      "errorGeneric",
      "errorSync",
      "syncUnreachable",
      "syncFeedNotFound",
    ] as const;
    for (const catalog of [ko, en, ja]) for (const key of keys) expect(catalog.blogImport[key]).toBeTruthy();
  });
});
