import { afterEach, describe, expect, it } from "vitest";
import { preparePostTranslation } from "./post-dom";

const ARTICLE = `
<h1 data-post-title>境界を引く</h1>
<div class="prose-post">
  <p>最初の<strong>段落</strong>と<a href="https://k6.io">リンク</a>。<mark class="hl" data-hl-id="3">印</mark></p>
  <h2 id="haikei"><a href="#haikei">背景</a></h2>
  <ul><li><input type="checkbox" checked disabled> 決める<ul><li>理由</li></ul></li></ul>
  <div class="code"><pre><code>const a = 1;</code></pre></div>
  <figure><img src="/a.png" alt=""></figure>
  <p>写真<img src="/b.png" alt="">付き</p>
  <aside role="note" data-callout="tip"><div>ヒント</div><p>短く書く</p></aside>
  <blockquote>引用の文</blockquote>
  <div class="prose-table-wrap"><table><thead><tr><th>指標</th></tr></thead><tbody><tr><td>応答</td></tr></tbody></table></div>
  <div class="section-divider" role="separator"></div>
</div>`;

afterEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  document.body.innerHTML = ARTICLE;
  const title = document.querySelector<HTMLElement>("[data-post-title]")!;
  const body = document.querySelector<HTMLElement>(".prose-post")!;
  return { title, body, ...preparePostTranslation(title, body) };
}

const shown = (body: HTMLElement) =>
  Array.from(body.children).filter((el) => !(el as HTMLElement).hidden);

describe("a post shown in translation", () => {
  it("translates the title and the text blocks in reading order, and leaves code, images and labels", () => {
    const { texts } = setup();
    expect(texts).toEqual(["境界を引く", "最初の段落とリンク。印", "背景", "決める", "理由", "短く書く", "引用の文", "指標", "応答"]);
  });

  it("swaps in plain translated text beside hidden originals and puts them back", () => {
    const { title, body, texts, apply } = setup();
    const restore = apply(texts.map((text) => `[ko] ${text}`), "ko");

    expect(title.hidden).toBe(true);
    expect(title.nextElementSibling!.textContent).toBe("[ko] 境界を引く");
    expect(title.nextElementSibling!.getAttribute("lang")).toBe("ko");
    const visible = shown(body).map((el) => el.textContent?.replace(/\s+/g, " ").trim());
    expect(visible).toEqual([
      "[ko] 最初の段落とリンク。印",
      "[ko] 背景",
      "[ko] 決める[ko] 理由",
      "const a = 1;",
      "",
      "写真付き",
      "ヒント[ko] 短く書く",
      "[ko] 引用の文",
      "[ko] 指標[ko] 応答",
      "",
    ]);
    const copies = body.querySelectorAll("[data-translation]");
    expect(copies).toHaveLength(6);
    for (const copy of copies) {
      expect(copy.querySelector("[id], mark, [data-hl-id]")).toBeNull();
    }
    expect(body.querySelector("[data-translation] input[type=checkbox]")).not.toBeNull();

    restore();
    expect(title.hidden).toBe(false);
    expect(body.querySelectorAll("[data-translation]")).toHaveLength(0);
    expect(body.querySelector("mark[data-hl-id='3']")).not.toBeNull();
    expect(shown(body)).toHaveLength(body.children.length);
  });

  it("refuses a translation that doesn't line up with the text", () => {
    const { apply } = setup();
    expect(() => apply(["하나"], "ko")).toThrow();
  });
});
