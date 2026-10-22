import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, ...rest }: { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest} />,
}));

import { NoteBody } from "./note-body";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function paragraph(node: React.ReactElement) {
  const root = document.createElement("template");
  root.innerHTML = renderToStaticMarkup(node);
  return root.content.querySelector("p");
}

describe("a note body on a page in another language", () => {
  it("carries the language its text is written in, so lines break and glyphs pick for that language", () => {
    expect(paragraph(<NoteBody body="오늘 쓴 글의 씨앗: 단축 링크가 사라지면 글도 같이 끊긴다" />)?.getAttribute("lang")).toBe("ko");
    expect(paragraph(<NoteBody body="結局のところ大事なのは読者が迷わないことだ" language="ko" />)?.getAttribute("lang")).toBe("ja");
  });

  it("takes the language the writer chose when the script can't tell", () => {
    expect(paragraph(<NoteBody body="Shipped the new editor today" language="en" />)?.getAttribute("lang")).toBe("en");
    expect(paragraph(<NoteBody body="Shipped the new editor today" />)?.hasAttribute("lang")).toBe(false);
  });
});

describe("a note body under its link card", () => {
  const video = "https://youtu.be/6Zo0eMZB6t4";

  it("shows the text without the closing link the card already shows", () => {
    const p = paragraph(<NoteBody body={`切り抜き\n${video}`} cardUrl={video} />);
    expect(p?.textContent).toBe("切り抜き");
    expect(p?.querySelector("a")).toBeNull();
  });

  it("renders nothing when the note is only that link, and keeps the link when there is no card", () => {
    expect(paragraph(<NoteBody body={video} cardUrl={video} />)).toBeNull();
    expect(paragraph(<NoteBody body={video} />)?.querySelector("a")?.getAttribute("href")).toBe(video);
  });
});
