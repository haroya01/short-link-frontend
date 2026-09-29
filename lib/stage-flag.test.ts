import { describe, expect, it } from "vitest";
import { resolveStageVariant } from "./stage-flag";

const base = { search: "", envDefault: undefined };

describe("resolveStageVariant", () => {
  it("URL 오버라이드가 최우선이다", () => {
    expect(resolveStageVariant({ ...base, search: "?stage=on", envDefault: "off" })).toBe("on");
    expect(resolveStageVariant({ ...base, search: "?stage=off" })).toBe("off");
  });

  it("잘못된 URL 값은 무시하고 기본값으로 내려간다", () => {
    expect(resolveStageVariant({ ...base, search: "?stage=banana" })).toBe("on");
  });

  it("아무 신호도 없으면 on — 무대가 기본", () => {
    expect(resolveStageVariant(base)).toBe("on");
  });

  it("envDefault=off 는 비상 강등", () => {
    expect(resolveStageVariant({ ...base, envDefault: "off" })).toBe("off");
  });
});
