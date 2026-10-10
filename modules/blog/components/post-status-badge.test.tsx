import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { PostStatusBadge } from "./post-status-badge";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
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

describe("post status badge", () => {
  it("names a taken-down post by that, not by its unpublished status", async () => {
    await act(async () => root.render(<PostStatusBadge status="UNPUBLISHED" takenDown />));
    expect(host.textContent).toBe("statusTakenDown");
    expect(host.firstElementChild!.className).toContain("text-red-700");
  });

  it("keeps the status label otherwise", async () => {
    await act(async () => root.render(<PostStatusBadge status="UNPUBLISHED" />));
    expect(host.textContent).toBe("statusUNPUBLISHED");
  });
});
