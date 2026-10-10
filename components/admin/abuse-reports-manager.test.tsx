import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AbuseReportView } from "@/lib/api/abuse-reports";

const mocks = vi.hoisted(() => {
  const translators = new Map<string, (key: string) => string>();
  return {
    listAbuseReports: vi.fn(),
    resolveAbuseReport: vi.fn(),
    translator: (namespace: string) => {
      if (!translators.has(namespace)) translators.set(namespace, (key: string) => `${namespace}.${key}`);
      return translators.get(namespace)!;
    },
  };
});
vi.mock("next-intl", () => ({ useTranslations: mocks.translator }));
vi.mock("@/lib/api/abuse-reports", () => ({
  listAbuseReports: mocks.listAbuseReports,
  resolveAbuseReport: mocks.resolveAbuseReport,
}));

import { AbuseReportsManager } from "./abuse-reports-manager";

const reply: AbuseReportView = {
  id: 5005,
  reporterUserId: null,
  subjectType: "HIGHLIGHT_REPLY",
  subjectId: 6003,
  reasonCode: "SPAM",
  detail: null,
  status: "OPEN",
  adminNote: null,
  createdAt: "2026-10-10T08:30:00.000Z",
  resolvedAt: null,
  subjectAuthorHandle: "promo_kim",
  subjectExcerpt: "제 채널도 구독해 주세요",
  subjectRemoved: false,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const button = (label: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === label);

describe("a reported highlight reply in the queue", () => {
  it("names what it is and takes it down with its own action", async () => {
    mocks.listAbuseReports.mockResolvedValue([reply]);
    mocks.resolveAbuseReport.mockResolvedValue({ ...reply, status: "RESOLVED", subjectRemoved: true });
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);
    vi.stubGlobal("prompt", vi.fn(() => ""));
    await act(async () => root.render(<AbuseReportsManager />));

    expect(host.textContent).toContain("abuseReports.subjectType.HIGHLIGHT_REPLY · @promo_kim");
    expect(button("abuseReports.action.DELETE_COMMENT")).toBeUndefined();
    await act(async () => button("abuseReports.action.DELETE_HIGHLIGHT_REPLY")!.click());

    expect(confirm).toHaveBeenCalledWith("abuseReports.actionConfirm.DELETE_HIGHLIGHT_REPLY");
    expect(mocks.resolveAbuseReport).toHaveBeenCalledWith(5005, {
      resolution: "RESOLVED",
      action: "DELETE_HIGHLIGHT_REPLY",
      suspendUntil: undefined,
      adminNote: undefined,
    });
    expect(host.textContent).toContain("abuseReports.removed");
  });
});
