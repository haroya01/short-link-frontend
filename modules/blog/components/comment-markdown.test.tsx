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
    const root = render("@minji 고마워요, @nobody_here 도 **@minji** 처럼", ["minji"]);
    const links = [...root.querySelectorAll("a")].map((a) => a.textContent);
    expect(links).toEqual(["@minji", "@minji"]);
    expect(root.textContent).toContain("@nobody_here");
  });

  it("keeps linking every handle where the server has not checked them, like the composer preview", () => {
    const root = render("@minji @nobody_here");
    expect([...root.querySelectorAll("a")].map((a) => a.textContent)).toEqual(["@minji", "@nobody_here"]);
  });
});
