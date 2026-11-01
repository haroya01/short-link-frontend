import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hour-chart", () => new Promise(() => {}));

import { LazyHourChart } from "./lazy-charts";

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

const track = () => host.querySelector(".animate-pulse")!;
const render = (node: React.ReactNode) => act(async () => root.render(node));

describe("the lazy hour chart holds its height while the chunk loads", () => {
  it("hourly: a full or compact track with no peak line", async () => {
    await render(<LazyHourChart data={[]} />);
    expect(track().className).toContain("h-72");
    await render(<LazyHourChart data={[]} compact />);
    expect(track().className).toContain("h-52");
    expect(host.querySelectorAll("p")).toHaveLength(0);
  });
});
