import fs from "fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

/**
 * `:lang()` matches every element inside a language subtree, so a font declared under it lands on
 * each descendant directly. That beats the font-mono utility and leaves code-highlight token spans —
 * which only inherit their monospace — in the body face. Language fonts belong on the element that
 * carries the lang attribute (`[lang|="ja"]`) and reach everything below it by inheritance.
 */
describe("language typography", () => {
  it("declares no font under a :lang() selector", () => {
    const root = postcss.parse(fs.readFileSync("app/globals.css", "utf8"));
    const hits: string[] = [];
    root.walkRules((rule) => {
      if (!rule.selector.includes(":lang(")) return;
      rule.walkDecls(/^font(-family)?$/, (decl) => {
        hits.push(`${rule.selector} { ${decl.prop} }`);
      });
    });
    expect(hits).toEqual([]);
  });
});
