import { describe, expect, it } from "vitest";
import { EXPLORE_LANES, laneOf, laneSearch } from "./explore-lane";

describe("explore lanes", () => {
  it("are 트렌드 then 사람", () => {
    expect(EXPLORE_LANES).toEqual(["trends", "people"]);
  });

  it("opens 트렌드 for the old picks and remote links, for no lane and for anything unknown", () => {
    expect(laneOf("picks")).toBe("trends");
    expect(laneOf("remote")).toBe("trends");
    expect(laneOf("trends")).toBe("trends");
    expect(laneOf(null)).toBe("trends");
    expect(laneOf("")).toBe("trends");
    expect(laneOf("PEOPLE")).toBe("trends");
  });

  it("opens 사람 for people", () => {
    expect(laneOf("people")).toBe("people");
  });

  it("carries no lane in the address for 트렌드, dropping an old one and keeping the rest", () => {
    expect(laneSearch("?lane=remote", "trends")).toBe("");
    expect(laneSearch("?lane=picks&utm_source=mail", "trends")).toBe("?utm_source=mail");
    expect(laneSearch("?lane=people", "trends")).toBe("");
  });

  it("writes people into the address", () => {
    expect(laneSearch("", "people")).toBe("?lane=people");
    expect(laneSearch("?utm_source=mail", "people")).toBe("?utm_source=mail&lane=people");
  });

  it("leaves an address that already says the lane exactly as it was", () => {
    expect(laneSearch("?q=a%20b", "trends")).toBe("?q=a%20b");
    expect(laneSearch("?lane=people&q=a%20b", "people")).toBe("?lane=people&q=a%20b");
    expect(laneSearch("", "trends")).toBe("");
  });
});
