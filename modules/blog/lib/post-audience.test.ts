import { describe, expect, it } from "vitest";
import {
  audiencePatch,
  cardMark,
  changesVisibility,
  isIndexable,
  isRedactedCard,
  passwordProblem,
  redactCard,
} from "./post-audience";

const card = {
  excerpt: "body-derived summary",
  ogImageUrl: "https://img.test/cover.png",
  thumbnailUrl: "https://img.test/thumb.png",
  tags: ["java"],
};

describe("a protected or country-limited card never carries body-derived parts", () => {
  it.each([
    ["a locked followers post", { audience: "FOLLOWERS" as const, locked: { reason: "FOLLOWERS" as const } }],
    ["a password post even without a lock", { audience: "PASSWORD" as const }],
    ["a public post with a country limit", { audience: "PUBLIC" as const, regionRestricted: true }],
    ["a post the server locked by region", { locked: { reason: "REGION" as const } }],
  ])("%s keeps only its title", (_, fields) => {
    const out = redactCard({ ...card, ...fields });
    expect(isRedactedCard(fields)).toBe(true);
    expect(out).toMatchObject({ excerpt: null, ogImageUrl: null, thumbnailUrl: null, tags: [] });
  });

  it("leaves a public card and a keyed link-only card untouched", () => {
    expect(redactCard({ ...card })).toEqual(card);
    expect(redactCard({ ...card, audience: "UNLISTED" as const })).toMatchObject({ excerpt: card.excerpt });
  });

  it("only indexes public posts without a lock or a country limit", () => {
    expect(isIndexable({})).toBe(true);
    expect(isIndexable({ audience: "PUBLIC" })).toBe(true);
    expect(isIndexable({ audience: "UNLISTED" })).toBe(false);
    expect(isIndexable({ audience: "FOLLOWERS" })).toBe(false);
    expect(isIndexable({ audience: "PASSWORD" })).toBe(false);
    expect(isIndexable({ audience: "PUBLIC", regionRestricted: true })).toBe(false);
    expect(isIndexable({ audience: "PUBLIC", locked: { reason: "REGION_CHECK" } })).toBe(false);
  });

  it("marks a card by the reason a reader is kept out, the audience first", () => {
    expect(cardMark({ audience: "FOLLOWERS", regionRestricted: true })).toBe("FOLLOWERS");
    expect(cardMark({ locked: { reason: "PASSWORD" } })).toBe("PASSWORD");
    expect(cardMark({ locked: { reason: "REGION_CHECK" } })).toBe("REGION");
    expect(cardMark({ regionRestricted: true })).toBe("REGION");
    expect(cardMark({ audience: "UNLISTED" })).toBe("UNLISTED");
    expect(cardMark({ audience: "PUBLIC" })).toBeNull();
  });
});

describe("the password a writer types", () => {
  it("is required only when switching to 비밀번호 with none stored", () => {
    expect(passwordProblem("PASSWORD", "", false)).toBe("required");
    expect(passwordProblem("PASSWORD", "", true)).toBeNull();
    expect(passwordProblem("FOLLOWERS", "", false)).toBeNull();
  });

  it("counts code points, not UTF-16 units, and never trims", () => {
    expect(passwordProblem("PASSWORD", "abc", false)).toBe("length");
    expect(passwordProblem("PASSWORD", "abcd", false)).toBeNull();
    expect(passwordProblem("PASSWORD", "    ", false)).toBeNull();
    expect(passwordProblem("PASSWORD", "😀😀😀", false)).toBe("length");
    expect(passwordProblem("PASSWORD", "가".repeat(200), false)).toBeNull();
    expect(passwordProblem("PASSWORD", "가".repeat(201), false)).toBe("length");
    expect(passwordProblem("PASSWORD", "😀".repeat(200), false)).toBeNull();
  });
});

describe("the access part of a save", () => {
  const saved = { audience: "PUBLIC" as const, hasPassword: false, blockedCountries: [] };

  it("sends nothing when the writer changed nothing, so another device's change survives", () => {
    expect(audiencePatch(saved, { audience: "PUBLIC", password: "", blockedCountries: [] })).toEqual({});
    expect(audiencePatch({}, { audience: "PUBLIC", password: "", blockedCountries: [] })).toEqual({});
  });

  it("sends a changed audience and a changed country set, in any order", () => {
    const patch = audiencePatch({ ...saved, blockedCountries: ["CN", "RU"] }, {
      audience: "FOLLOWERS",
      password: "",
      blockedCountries: ["RU", "CN", "KP"],
    });
    expect(patch).toEqual({ audience: "FOLLOWERS", blockedCountries: ["RU", "CN", "KP"] });
    expect(changesVisibility(patch)).toBe(true);
    expect(
      audiencePatch({ ...saved, blockedCountries: ["CN", "RU"] }, { audience: "PUBLIC", password: "", blockedCountries: ["RU", "CN"] }),
    ).toEqual({});
  });

  it("clears the country set with an empty list", () => {
    expect(audiencePatch({ ...saved, blockedCountries: ["CN"] }, { audience: "PUBLIC", password: "", blockedCountries: [] })).toEqual({
      blockedCountries: [],
    });
  });

  it("holds back a switch to 비밀번호 until a usable password is typed", () => {
    expect(audiencePatch(saved, { audience: "PASSWORD", password: "", blockedCountries: [] })).toEqual({});
    expect(audiencePatch(saved, { audience: "PASSWORD", password: "abc", blockedCountries: [] })).toEqual({});
    expect(audiencePatch(saved, { audience: "PASSWORD", password: "open sesame", blockedCountries: [] })).toEqual({
      audience: "PASSWORD",
      password: "open sesame",
    });
  });

  it("switches back to 비밀번호 on the stored hash, and changes only the password when that's all that moved", () => {
    expect(audiencePatch({ ...saved, hasPassword: true }, { audience: "PASSWORD", password: "", blockedCountries: [] })).toEqual({
      audience: "PASSWORD",
    });
    const onlyPassword = audiencePatch(
      { audience: "PASSWORD", hasPassword: true, blockedCountries: [] },
      { audience: "PASSWORD", password: "new one", blockedCountries: [] },
    );
    expect(onlyPassword).toEqual({ password: "new one" });
    expect(changesVisibility(onlyPassword)).toBe(false);
  });

  it("never sends a password for another audience", () => {
    expect(audiencePatch(saved, { audience: "FOLLOWERS", password: "left over", blockedCountries: [] })).toEqual({
      audience: "FOLLOWERS",
    });
  });
});
