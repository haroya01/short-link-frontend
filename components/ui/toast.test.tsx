import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastAction } from "./toast";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

let root: Root;
let host: HTMLDivElement;
let fire: (message: string, action?: ToastAction) => void;

function Trigger() {
  const { toast } = useToast();
  fire = (message, action) => toast(message, "default", action ? { action } : undefined);
  return null;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("React", React);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    ),
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const toastEl = () => host.querySelector<HTMLElement>('[role="status"]');
const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms));

describe("toast", () => {
  it("keeps the whole message and wraps it instead of cutting it to one line", async () => {
    await act(async () => fire("내 내용으로 덮었어요. 덮인 내용은 리비전에서 되돌릴 수 있어요."));
    const text = toastEl()!.querySelector("span")!;
    expect(text.textContent).toBe("내 내용으로 덮었어요. 덮인 내용은 리비전에서 되돌릴 수 있어요.");
    expect(text.className).not.toContain("truncate");
    expect(text.className).toContain("break-keep");
  });

  it("leaves after 2.6s without an action", async () => {
    await act(async () => fire("저장했어요"));
    await advance(2599);
    expect(toastEl()).not.toBeNull();
    await advance(1);
    await advance(200);
    expect(toastEl()).toBeNull();
  });

  it("stays 4.5s with an action, runs it once and closes", async () => {
    const onClick = vi.fn();
    await act(async () => fire("노트를 올렸어요", { label: "보기", onClick }));
    await advance(4000);
    const view = Array.from(toastEl()!.querySelectorAll("button")).find((b) => b.textContent === "보기")!;
    await act(async () => view.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    await advance(200);
    expect(toastEl()).toBeNull();
  });

  it("closes an action toast on its own at 4.5s", async () => {
    await act(async () => fire("노트를 올렸어요", { label: "보기", onClick: vi.fn() }));
    await advance(4499);
    expect(toastEl()).not.toBeNull();
    await advance(1);
    await advance(200);
    expect(toastEl()).toBeNull();
  });

  it("holds while keyboard focus is inside it", async () => {
    await act(async () => fire("노트를 올렸어요", { label: "보기", onClick: vi.fn() }));
    await advance(4000);
    const view = Array.from(toastEl()!.querySelectorAll("button")).find((b) => b.textContent === "보기")!;
    await act(async () => view.focus());
    await advance(10_000);
    expect(toastEl()).not.toBeNull();
    await act(async () => view.blur());
    await advance(1200);
    await advance(200);
    expect(toastEl()).toBeNull();
  });

  it("holds while the pointer is on it, then gives time to finish", async () => {
    await act(async () => fire("노트를 올렸어요", { label: "보기", onClick: vi.fn() }));
    await advance(4000);
    await act(async () => toastEl()!.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
    await advance(10_000);
    expect(toastEl()).not.toBeNull();
    await act(async () => toastEl()!.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })));
    await advance(1199);
    expect(toastEl()).not.toBeNull();
    await advance(1);
    await advance(200);
    expect(toastEl()).toBeNull();
  });
});
