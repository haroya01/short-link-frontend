import { describe, expect, it } from "vitest";
import { eventFormErrors, serverFieldErrors } from "./form-rules";

const filled = {
  title: "성수 모각코",
  startsAtLocal: "2026-11-10T19:00",
  endsAtLocal: "2026-11-10T21:00",
  capacity: "20",
  closeAtLocal: "2026-11-09T23:00",
};

describe("eventFormErrors", () => {
  it("passes a filled form, and one with only a title and a start", () => {
    expect(eventFormErrors(filled)).toEqual({});
    expect(eventFormErrors({ ...filled, endsAtLocal: "", capacity: "", closeAtLocal: "" })).toEqual({});
  });

  it("asks for a title and a start", () => {
    expect(eventFormErrors({ ...filled, title: "  ", startsAtLocal: "", endsAtLocal: "", closeAtLocal: "" })).toEqual({
      title: "titleRequired",
      startsAt: "startRequired",
    });
  });

  it("rejects an end before the start and accepts an end equal to it", () => {
    expect(eventFormErrors({ ...filled, endsAtLocal: "2026-11-10T18:59", closeAtLocal: "" }).endsAt).toBe("endBeforeStart");
    expect(eventFormErrors({ ...filled, endsAtLocal: "2026-08-10T09:17", closeAtLocal: "" }).endsAt).toBe("endBeforeStart");
    expect(eventFormErrors({ ...filled, endsAtLocal: filled.startsAtLocal, closeAtLocal: "" })).toEqual({});
  });

  it("keeps the sign-up deadline at or before the end, or before the start when there is no end", () => {
    expect(eventFormErrors({ ...filled, closeAtLocal: "2026-11-10T21:00" })).toEqual({});
    expect(eventFormErrors({ ...filled, closeAtLocal: "2026-11-10T21:01" }).closeAt).toBe("closeAfterEnd");
    expect(eventFormErrors({ ...filled, endsAtLocal: "", closeAtLocal: "2026-11-10T19:00" })).toEqual({});
    expect(eventFormErrors({ ...filled, endsAtLocal: "", closeAtLocal: "2026-11-10T20:00" }).closeAt).toBe("closeAfterStart");
  });

  it("needs a whole capacity of at least one", () => {
    for (const bad of ["0", "-3", "1.5", "abc"]) {
      expect(eventFormErrors({ ...filled, capacity: bad }).capacity).toBe("capacityMin");
    }
    expect(eventFormErrors({ ...filled, capacity: "1" })).toEqual({});
  });
});

describe("serverFieldErrors", () => {
  it("pins the server's time and capacity rejections to their fields", () => {
    expect(serverFieldErrors({ code: "INVALID_EVENT_DETAILS", field: "endsAt" }, true)).toEqual({ endsAt: "endBeforeStart" });
    expect(serverFieldErrors({ code: "INVALID_EVENT_DETAILS", field: "closeAt" }, true)).toEqual({ closeAt: "closeAfterEnd" });
    expect(serverFieldErrors({ code: "INVALID_EVENT_DETAILS", field: "closeAt" }, false)).toEqual({ closeAt: "closeAfterStart" });
    expect(
      serverFieldErrors({ code: "VALIDATION_FAILED", errors: [{ field: "capacity" }] }, false),
    ).toEqual({ capacity: "capacityMin" });
  });

  it("leaves anything else to the line above the publish button", () => {
    expect(serverFieldErrors({ code: "INVALID_EVENT_DETAILS" }, true)).toEqual({});
    expect(serverFieldErrors({ code: "VALIDATION_FAILED", errors: [{ field: "title" }] }, true)).toEqual({});
    expect(serverFieldErrors({}, true)).toEqual({});
  });
});
