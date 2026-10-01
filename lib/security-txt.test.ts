import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { shortCodeOf } from "./link-reference";

const file = readFileSync(path.resolve(__dirname, "../public/.well-known/security.txt"), "utf8");

function field(name: string): string[] {
  return file
    .split("\n")
    .filter((line) => line.startsWith(`${name}: `))
    .map((line) => line.slice(name.length + 2).trim());
}

/** RFC 9116: Contact and Expires are required, Expires appears once, contact URIs are https. */
describe("security.txt", () => {
  it("names at least one https contact, and the report page is a real route rather than a short code", () => {
    const contacts = field("Contact");
    expect(contacts.length).toBeGreaterThan(0);
    for (const contact of contacts) expect(contact.startsWith("https://")).toBe(true);
    expect(contacts).toContain("https://kurl.me/en/report");
    expect(shortCodeOf("https://kurl.me/en/report")).toBeNull();
  });

  it("carries exactly one parseable Expires", () => {
    const expires = field("Expires");
    expect(expires).toHaveLength(1);
    expect(Number.isNaN(Date.parse(expires[0]))).toBe(false);
  });

  it("points Canonical at itself on kurl.me", () => {
    expect(field("Canonical")).toEqual(["https://kurl.me/.well-known/security.txt"]);
  });
});
