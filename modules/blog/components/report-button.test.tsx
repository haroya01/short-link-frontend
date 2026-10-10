import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AbuseSubjectType } from "@/lib/api/abuse-reports";

vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ me: { id: 1, username: "dohyun" } }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api/abuse-reports", () => ({ submitAbuseReport: vi.fn() }));

import { ReportButton } from "./report-button";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
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

describe("report dialog title", () => {
  it.each<[AbuseSubjectType, string]>([
    ["POST", "publicPost.reportTitle"],
    ["NOTE", "publicPost.reportTitleNote"],
    ["USER", "publicPost.reportTitleUser"],
    ["COMMENT", "publicPost.reportTitleComment"],
  ])("names a %s report by what is reported", async (subjectType, title) => {
    await act(async () =>
      root.render(<ReportButton subjectType={subjectType} subjectId={7} open onOpenChange={vi.fn()} />),
    );
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector("h2")!.textContent).toBe(title);
  });
});
