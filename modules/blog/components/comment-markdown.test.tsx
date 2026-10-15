import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CommentBody } from "./comment-markdown";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function render(text: string, mentions?: string[]) {
  const root = document.createElement("template");
  root.innerHTML = renderToStaticMarkup(<CommentBody text={text} locale="ko" mentions={mentions} />);
  return root.content;
}

describe("comment mentions", () => {
  it("links only the handles the server found among members", () => {
    const text = "@minji 고마워요, @nobody_here 도 **@minji** 처럼";
    const root = render(text, ["minji"]);
    const links = [...root.querySelectorAll("a")].map((a) => a.textContent);
    expect(links).toEqual(["@minji", "@minji"]);
    expect(root.textContent).toBe(text.replaceAll("**", ""));
  });

  it("carries the language the comment is written in, whatever the page language", () => {
    expect(render("트레이드오프 정리가 깔끔하네요").firstElementChild?.getAttribute("lang")).toBe("ko");
    expect(render("読者が迷わないことだと気づきました").firstElementChild?.getAttribute("lang")).toBe("ja");
    expect(render("nice write-up").firstElementChild?.hasAttribute("lang")).toBe(false);
  });

  it("keeps linking every handle where the server has not checked them, like the composer preview", () => {
    const root = render("@minji @nobody_here");
    expect([...root.querySelectorAll("a")].map((a) => a.textContent)).toEqual(["@minji", "@nobody_here"]);
    expect(root.textContent).toBe("@minji @nobody_here");
  });
});
