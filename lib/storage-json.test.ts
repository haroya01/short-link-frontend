import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readStorageJson, writeStorageJson } from "./storage-json";

const KEY = "test:storage-json";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

describe("readStorageJson", () => {
  it("returns the fallback when the key is missing", () => {
    expect(readStorageJson(KEY, isStringArray, [])).toEqual([]);
  });

  it("returns the parsed value when JSON + guard pass", () => {
    window.localStorage.setItem(KEY, JSON.stringify(["a", "b"]));
    expect(readStorageJson(KEY, isStringArray, [])).toEqual(["a", "b"]);
  });

  it("returns the fallback when the JSON is malformed", () => {
    window.localStorage.setItem(KEY, "not json {{{");
    expect(readStorageJson(KEY, isStringArray, ["fallback"])).toEqual(["fallback"]);
  });

  it("returns the fallback when the guard fails — does NOT trust shape from storage", () => {
    // Storage holds a valid JSON value of the wrong shape (number, not string array). Without the
    // guard the caller would get a number and crash downstream — guard converts it to the safe
    // fallback.
    window.localStorage.setItem(KEY, JSON.stringify(42));
    expect(readStorageJson(KEY, isStringArray, [])).toEqual([]);
  });

  it("rejects an array with wrong item types — guard runs per-item, not just on the container", () => {
    // {@code Array.isArray} alone would have accepted this — the dedicated guard catches schema
    // drift (a v1 string-array migrated to v2 object-array, but the v1 read path still in use).
    window.localStorage.setItem(KEY, JSON.stringify([1, 2, 3]));
    expect(readStorageJson(KEY, isStringArray, [])).toEqual([]);
  });
});

describe("writeStorageJson", () => {
  it("writes JSON-serialized values to localStorage", () => {
    writeStorageJson(KEY, ["a", "b"]);
    expect(window.localStorage.getItem(KEY)).toBe('["a","b"]');
  });

  it("overwrites prior values for the same key", () => {
    writeStorageJson(KEY, ["first"]);
    writeStorageJson(KEY, ["second"]);
    expect(window.localStorage.getItem(KEY)).toBe('["second"]');
  });
});
