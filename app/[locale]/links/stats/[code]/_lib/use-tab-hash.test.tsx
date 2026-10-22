import React, { act, createElement } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTabHash } from "./use-tab-hash";

let container: HTMLDivElement;
let root: Root | undefined;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  container.remove();
  history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

function Probe() {
  const [tab, setTab] = useTabHash();
  return createElement("button", { onClick: () => setTab("who") }, tab);
}

it("hydrates a server-rendered page on the overview, then opens the tab in the hash", async () => {
  history.replaceState(null, "", "/");
  container.innerHTML = renderToString(createElement(Probe));
  history.replaceState(null, "", "/#log");
  const onRecoverableError = vi.fn();
  await act(async () => {
    root = hydrateRoot(container, createElement(Probe), { onRecoverableError });
  });
  expect(onRecoverableError).not.toHaveBeenCalled();
  expect(container.textContent).toBe("log");
});

it("opens a deep-linked tab on the first client render and pushes the next tab", async () => {
  history.replaceState(null, "", "/#log");
  root = createRoot(container);
  const seen: string[] = [];
  function Recorder() {
    const [tab] = useTabHash();
    seen.push(tab);
    return createElement(Probe);
  }
  await act(async () => root!.render(createElement(Recorder)));
  expect(seen[0]).toBe("log");
  await act(async () => container.querySelector("button")!.click());
  expect(window.location.hash).toBe("#who");
  expect(container.textContent).toBe("who");
});
