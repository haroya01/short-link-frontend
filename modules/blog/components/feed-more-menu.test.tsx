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

const feeds: FeedMoreItem[] = [
  { key: "federated", label: "다른 서버", icon: "globe", href: "?feed=federated" },
  { key: "bookmarks", label: "북마크", icon: "bookmark", href: "?feed=bookmarks" },
];

describe("the 더 보기 menu", () => {
  it("is named for its surface, shows only the chevron besides the word, and names the feed it has open", async () => {
    await render(<FeedMoreMenu items={feeds} label="더 보기" name="노트 피드 더 보기" activeKey={null} />);
    expect(trigger().getAttribute("aria-label")).toBe("노트 피드 더 보기");
    expect(trigger().hasAttribute("data-active")).toBe(false);
    expect(trigger().querySelectorAll("svg")).toHaveLength(1);
    expect(trigger().textContent).toBe("더 보기");
    await render(<FeedMoreMenu items={feeds} label="더 보기" name="노트 피드 더 보기" activeKey="federated" />);
    expect(trigger().getAttribute("aria-label")).toBe("노트 피드 더 보기: 다른 서버");
    expect(trigger().getAttribute("data-active")).toBe("true");
    expect(trigger().querySelectorAll("svg")).toHaveLength(2);
    expect(trigger().textContent).toBe("다른 서버");
  });

  it("carries a view setting as a checkable item after the sources", async () => {
    const onChange = vi.fn();
    await render(
      <FeedMoreMenu
        items={feeds}
        toggles={[{ key: "reposts", label: "리포스트 보기", checked: true, onChange }]}
        label="더 보기"
        name="노트 피드 더 보기"
        activeKey={null}
      />,
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
