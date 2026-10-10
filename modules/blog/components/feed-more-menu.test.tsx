import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, ...rest }: { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest} />,
}));

import { FeedMoreMenu, type FeedMoreItem } from "./feed-more-menu";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const render = (node: React.ReactNode) => act(async () => root.render(node));
const trigger = () => container.querySelector<HTMLButtonElement>("[data-feed-more] > button")!;
const open = () => act(async () => trigger().click());

const feeds = (active?: string): FeedMoreItem[] =>
  ["federated", "bookmarks"].map((key) => ({ key, label: key === "federated" ? "다른 서버" : "북마크", href: `?feed=${key}`, active: key === active }));

describe("the 더 보기 menu", () => {
  it("is named 더 보기, and names the source it is showing when one of its sources is open", async () => {
    await render(<FeedMoreMenu items={feeds()} label="더 보기" />);
    expect(trigger().getAttribute("aria-label")).toBe("더 보기");
    await render(<FeedMoreMenu items={feeds("federated")} label="더 보기" />);
    expect(trigger().getAttribute("aria-label")).toBe("더 보기: 다른 서버");
  });

  it("carries a view setting as a checkable item after the sources", async () => {
    const onChange = vi.fn();
    await render(
      <FeedMoreMenu items={feeds()} toggles={[{ key: "reposts", label: "리포스트 보기", checked: true, onChange }]} label="더 보기" />,
    );
    await open();
    const rows = [...container.querySelectorAll('[role="menu"] > *')].map((el) => el.getAttribute("role"));
    expect(rows).toEqual(["menuitem", "menuitem", "separator", "menuitemcheckbox"]);
    const toggle = container.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!;
    expect(toggle.textContent).toBe("리포스트 보기");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    await act(async () => toggle.click());
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
