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
    ["HIGHLIGHT_REPLY", "publicPost.reportTitleHighlightReply"],
  ])("names a %s report by what is reported", async (subjectType, title) => {
    await act(async () =>
      root.render(<ReportButton subjectType={subjectType} subjectId={7} open onOpenChange={vi.fn()} />),
    );
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector("h2")!.textContent).toBe(title);
  });
});

describe("a report asked from inside another overlay", () => {
  it("rises above it as its own layer and closes only from outside the form", async () => {
    const onOpenChange = vi.fn();
    await act(async () =>
      root.render(
        <ReportButton subjectType="HIGHLIGHT_REPLY" subjectId={6001} open onOpenChange={onOpenChange} layerClassName="z-[70]" />,
      ),
    );
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.parentElement!.className).toContain("z-[70]");

    dialog.querySelector("input")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onOpenChange).not.toHaveBeenCalled();
    dialog.parentElement!.querySelector(".scrim")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
