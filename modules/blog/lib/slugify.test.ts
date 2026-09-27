import { describe, expect, it } from "vitest";
import { headingAnchors, headingPlainText, slugify } from "./slugify";

describe("headingAnchors", () => {
  it("keeps readable ascii slugs and numbers the rest so copied links stay short", () => {
    expect(
      headingAnchors(["flyway", "**Reactive Streams バックプレッシャーのサポート**", "Spring MVC", "はじめに"]),
    ).toEqual(["flyway", "section-2", "spring-mvc", "section-4"]);
  });

  it("keeps the legacy slug available for links shared before the change", () => {
    expect(slugify("**Reactive Streams バックプレッシャーのサポート**")).toBe(
      "reactive-streams-バックプレッシャーのサポート",
    );
  });
});

describe("headingPlainText", () => {
  it("drops inline markdown markers for the table of contents", () => {
    expect(headingPlainText("**Reactive Streams バックプレッシャーのサポート**")).toBe(
      "Reactive Streams バックプレッシャーのサポート",
    );
    expect(headingPlainText("Reactive環境において `@Transaction` はどのように動作するのでしょうか？")).toBe(
      "Reactive環境において @Transaction はどのように動作するのでしょうか？",
    );
    expect(headingPlainText("[docs](https://example.com) と _強調_")).toBe("docs と 強調");
  });

  it("leaves snake_case and lone asterisks alone", () => {
    expect(headingPlainText("user_id と a * b")).toBe("user_id と a * b");
  });
});
