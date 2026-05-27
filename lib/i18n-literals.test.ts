import fs from "fs";
import path from "path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components", "hooks", "lib"];
const CJK = /[가-힣ぁ-んァ-ン一-龥]/;
const EXCLUDED =
  /(\.test\.|fixtures|mock-data|demo-data|admin-request-metrics-mock|messages[\\/])/;

function filesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

function sourceKind(file: string) {
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function literalLeaks(file: string): string[] {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, sourceKind(file));
  const leaks: string[] = [];

  function location(node: ts.Node) {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return `${file}:${line + 1}:${character + 1}`;
  }

  function record(node: ts.Node, text: string) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized && CJK.test(normalized)) {
      leaks.push(`${location(node)} ${normalized}`);
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      record(node, node.text);
    } else if (
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    ) {
      record(node, (node as ts.TemplateLiteralLikeNode).text);
    } else if (ts.isJsxText(node)) {
      record(node, node.getText(sf));
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return leaks;
}

describe("runtime i18n literals", () => {
  it("keeps CJK copy in message catalogs or fixture/test data", () => {
    const leaks = ROOTS.flatMap(filesUnder)
      .filter((file) => !EXCLUDED.test(file))
      .flatMap(literalLeaks);

    expect(leaks).toEqual([]);
  });
});
