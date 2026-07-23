import { describe, expect, it } from "vitest";
import { resolveStageVariant } from "./stage-flag";

const base = { search: "", cookie: "", envDefault: undefined, envSplit: undefined };

describe("resolveStageVariant", () => {
  it("URL 오버라이드가 최우선이고 쿠키로 고정된다", () => {
    const res = resolveStageVariant({ ...base, search: "?stage=on", cookie: "kurl_stage=off" });
    expect(res).toEqual({ variant: "on", persist: true, assigned: false });
  });

  it("?stage=off 로 즉시 롤백 프리뷰가 된다", () => {
    const res = resolveStageVariant({ ...base, search: "?stage=off", envDefault: "on" });
    expect(res.variant).toBe("off");
    expect(res.persist).toBe(true);
  });

  it("잘못된 URL 값은 무시하고 다음 단계로 내려간다", () => {
    const res = resolveStageVariant({ ...base, search: "?stage=banana", cookie: "kurl_stage=on" });
    expect(res).toEqual({ variant: "on", persist: false, assigned: false });
  });

  it("쿠키가 URL 없을 때의 진실원이다 (다른 쿠키 사이에서도)", () => {
    const res = resolveStageVariant({
      ...base,
      cookie: "NEXT_LOCALE=ko; kurl_stage=on; kurl_blog_default_tab=trending",
    });
    expect(res).toEqual({ variant: "on", persist: false, assigned: false });
  });

  it("split 배정: roll < split 이면 on, 새 배정은 persist + assigned", () => {
    const on = resolveStageVariant({ ...base, envSplit: "50", random: () => 0.49 });
    expect(on).toEqual({ variant: "on", persist: true, assigned: true });
    const off = resolveStageVariant({ ...base, envSplit: "50", random: () => 0.51 });
    expect(off).toEqual({ variant: "off", persist: true, assigned: true });
  });

  it("split=0 또는 비수치면 배정 없이 envDefault 로 폴백", () => {
    expect(resolveStageVariant({ ...base, envSplit: "0", envDefault: "on" }).variant).toBe("on");
    expect(resolveStageVariant({ ...base, envSplit: "abc" }).variant).toBe("off");
  });

  it("아무 신호도 없으면 off — 머지 자체는 무위험", () => {
    expect(resolveStageVariant(base)).toEqual({
      variant: "off",
      persist: false,
      assigned: false,
    });
  });

  it("기존 쿠키가 split 재배정을 막는다 (배정 고정성)", () => {
    const res = resolveStageVariant({
      ...base,
      cookie: "kurl_stage=off",
      envSplit: "100",
      random: () => 0,
    });
    expect(res).toEqual({ variant: "off", persist: false, assigned: false });
  });
});
