import fs from "node:fs";
import path from "node:path";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicPostBlock } from "@/modules/blog/api/public-posts";

vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next-intl", () => ({ useTranslations: (ns?: string) => (key: string) => `${ns}.${key}` }));
vi.mock("@/modules/notes/components/quoted-note-card", () => ({ QuotedNoteCard: () => null }));
vi.mock("@/modules/blog/components/blog-link", () => ({ BlogLink: () => null, BlogChromeLink: () => null }));
vi.stubGlobal("React", React);

import { ArticleBody } from "@/app/[locale]/p/[username]/_components/post-blocks";
import { ClientArticleBody } from "./client-article-body";

const row = (type: string, content: string, blockOrder: number): PublicPostBlock => ({ type, content, blockOrder, cta: null });

const BLOCKS: PublicPostBlock[] = [
  row("H2", "## 배경", 0),
  row("PARAGRAPH", 'Hello <span style="color: red; background: url(https://evil.test/x)">red</span> <mark>marked</mark>', 1),
  row("PARAGRAPH", '<img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>', 2),
  row("QUOTE", "[!TIP]\n`@Transactional` 은 **publisher** 에", 3),
  row("QUOTE", "ℹ️ **Note**", 4),
  row("PARAGRAPH", "**바로 아래 문단이 상자가 된다**", 5),
  row("LIST_BULLET", "- [ ] 의존성\n- [x] 설정", 6),
  row("CODE", JSON.stringify({ lang: "ts", code: "const a: number = 1; // <b>not bold</b>" }), 7),
  row("TABLE", "| a | b |\n|---|---|\n| 1 | 2 |", 8),
  row("IMAGE", JSON.stringify({ url: "https://img.test/a.png", alt: "a", caption: "c", width: "wide" }), 9),
  row("PARAGRAPH", "----", 10),
];

describe("the reader body drawn by the browser after unlocking", () => {
  it("is the same markup the server draws, through the same sanitizer", () => {
    const server = renderToStaticMarkup(createElement(ArticleBody, { blocks: BLOCKS, postId: 7 }));
    const browser = renderToStaticMarkup(createElement(ClientArticleBody, { blocks: BLOCKS, postId: 7 }));
    expect(browser).toBe(server);
    expect(server).not.toMatch(/<script|onerror|javascript:|url\(/);
    expect(server).toContain('<span style="color:red">red</span>');
    expect(server).toContain("<mark>");
  });

  it("has one markdown pipeline: both sides render blocks only through ArticleBlocks", () => {
    const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), "utf8");
    const server = read("../../../app/[locale]/p/[username]/_components/post-blocks.tsx");
    const browser = read("./client-article-body.tsx");
    for (const source of [server, browser]) {
      expect(source).toContain('from "@/modules/blog/components/article-blocks"');
      expect(source).not.toContain("components/markdown");
      expect(source).not.toContain("rehype");
    }
    expect(read("./article-blocks.tsx")).toContain('import { Markdown } from "@/modules/blog/components/markdown"');
  });
});
