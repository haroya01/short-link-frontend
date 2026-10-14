import { describe, expect, it } from "vitest";
import { linksPublicPath } from "./links-path";

describe("linksPublicPath", () => {
  it("maps the rewritten links root to the public home", () => {
    expect(linksPublicPath("/links")).toBe("/");
  });

  it("drops the rewrite prefix from links routes", () => {
    expect(linksPublicPath("/links/qr-campaigns")).toBe("/qr-campaigns");
    expect(linksPublicPath("/links/stats/abc")).toBe("/stats/abc");
  });

  it("leaves public paths as they are", () => {
    expect(linksPublicPath("/")).toBe("/");
    expect(linksPublicPath("/events")).toBe("/events");
    expect(linksPublicPath("/linksy")).toBe("/linksy");
  });
});
