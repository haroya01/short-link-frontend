import fs from "fs";
import path from "path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { AbstractIntlMessages } from "next-intl";
import ko from "@/messages/ko.json";
import {
  CLIENT_MESSAGE_SCOPES,
  mergeMessages,
  parentScope,
  pickMessages,
  scopeMessages,
  visibleNamespaces,
  type ClientMessageScope,
} from "./client-namespaces";

/**
 * 메시지 스코프 가드 — 각 스코프 레이아웃 아래에서 "클라이언트로 도는" 모듈을 import 그래프로
 * 전부 따라가 useTranslations 네임스페이스를 모으고, CLIENT_MESSAGE_SCOPES 와 대조한다.
 *
 * 클라이언트 판정은 Next 와 같다: "use client" 모듈과, 클라이언트 모듈이 import 하는 모든 모듈.
 * 서버 컴포넌트의 useTranslations/getTranslations 는 서버 카탈로그 전체를 쓰므로 대상이 아니다.
 * 파일의 스코프는 그 파일을 감싸는 가장 깊은 스코프 레이아웃이다.
 */
const APP = path.join("app", "[locale]");
const ENTRY = /^(page|layout|template|loading|error|not-found|default)\.tsx?$/;
const EXTS = [".tsx", ".ts"];
const SCOPES = CLIENT_MESSAGE_SCOPES as Record<ClientMessageScope, readonly string[]>;
const SCOPE_KEYS = Object.keys(SCOPES) as ClientMessageScope[];

type ModuleInfo = {
  client: boolean;
  imports: string[];
  namespaces: string[];
  problems: string[];
};

const infoCache = new Map<string, ModuleInfo>();
const unresolved = new Set<string>();

function moduleInfo(file: string): ModuleInfo {
  const cached = infoCache.get(file);
  if (cached) return cached;
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);

  let client = false;
  for (const statement of sf.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === "use client") client = true;
  }

  const imports: string[] = [];
  const namespaces: string[] = [];
  const problems: string[] = [];
  const translators = new Set<string>();
  const where = (node: ts.Node) =>
    `${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const named = clause?.namedBindings && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
        : undefined;
      const typeOnly =
        clause?.isTypeOnly ||
        (clause && !clause.name && named && named.length > 0 && named.every((e) => e.isTypeOnly));
      if (!typeOnly) imports.push(node.moduleSpecifier.text);
      if (node.moduleSpecifier.text === "next-intl") {
        for (const element of named ?? []) {
          const imported = (element.propertyName ?? element.name).text;
          if (imported === "useTranslations") translators.add(element.name.text);
          if (imported === "useMessages" && !file.endsWith("scoped-intl-provider.tsx")) {
            problems.push(`${where(element)} useMessages 는 스코프 밖 메시지까지 기대한다`);
          }
        }
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !node.isTypeOnly
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node)) {
      const [arg] = node.arguments;
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        if (arg && ts.isStringLiteral(arg)) imports.push(arg.text);
        else problems.push(`${where(node)} 경로가 정적이지 않은 import()`);
      } else if (ts.isIdentifier(node.expression) && translators.has(node.expression.text)) {
        if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
          namespaces.push(arg.text);
        } else {
          problems.push(`${where(node)} 네임스페이스가 문자열 리터럴이 아닌 useTranslations`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  const info = { client, imports, namespaces, problems };
  infoCache.set(file, info);
  return info;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = path.join(path.dirname(from), spec);
  else return null;
  if (/\.(css|json|svg|png|jpe?g|webp|gif|woff2?)$/.test(base)) return null;
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, `index${e}`))];
  const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!hit) unresolved.add(`${from} → ${spec}`);
  return hit ?? null;
}

/** 진입 파일들에서 클라이언트로 도는 모듈의 네임스페이스 → 사용 파일. */
function clientNamespaces(entries: string[]) {
  const used = new Map<string, Set<string>>();
  const problems = new Set<string>();
  const seen = new Set<string>();
  const stack = entries.map((file) => ({ file, client: moduleInfo(file).client }));
  while (stack.length > 0) {
    const { file, client } = stack.pop()!;
    const key = `${client ? "client" : "server"}:${file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const info = moduleInfo(file);
    if (client) {
      for (const namespace of info.namespaces) {
        if (!used.has(namespace)) used.set(namespace, new Set());
        used.get(namespace)!.add(file);
      }
      for (const problem of info.problems) problems.add(problem);
    }
    for (const spec of info.imports) {
      const target = resolveImport(file, spec);
      if (target) stack.push({ file: target, client: client || moduleInfo(target).client });
    }
  }
  return { used, problems };
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [file] : [];
  });
}

const leafCount = (messages: unknown): number =>
  messages && typeof messages === "object" && !Array.isArray(messages)
    ? Object.values(messages).reduce((n: number, value) => n + leafCount(value), 0)
    : 1;

function entriesUnder(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entriesUnder(file);
    return ENTRY.test(entry.name) ? [file] : [];
  });
}

const scopeDir = (scope: ClientMessageScope) => (scope === "root" ? APP : path.join(APP, scope));
const inside = (file: string, dir: string) => file.startsWith(dir + path.sep);

/** 파일을 감싸는 가장 깊은 스코프 레이아웃의 스코프. */
function ownerOf(file: string): ClientMessageScope {
  return SCOPE_KEYS.filter((s) => inside(file, scopeDir(s))).sort(
    (a, b) => scopeDir(b).length - scopeDir(a).length,
  )[0];
}

const inherited = (scope: ClientMessageScope) => {
  const parent = parentScope(scope);
  return parent ? visibleNamespaces(parent) : [];
};

const covers = (entry: string, namespace: string) =>
  namespace === entry || namespace.startsWith(`${entry}.`);
const overlaps = (a: string, b: string) => covers(a, b) || covers(b, a);

/** 가장 구체적인 네임스페이스만 남긴 목록(상위가 이미 쓰이면 하위는 빠진다). */
function minimalCover(namespaces: Iterable<string>, fromParents: string[]): string[] {
  const all = [...new Set(namespaces)].filter((n) => !fromParents.some((e) => covers(e, n))).sort();
  return all.filter((n) => !all.some((other) => other !== n && covers(other, n)));
}

const ownedEntries = new Map<ClientMessageScope, string[]>(SCOPE_KEYS.map((s) => [s, []]));
for (const file of entriesUnder(APP)) ownedEntries.get(ownerOf(file))!.push(file);
const scans = new Map(SCOPE_KEYS.map((s) => [s, clientNamespaces(ownedEntries.get(s)!)]));

function suggestion(): string {
  const lines = SCOPE_KEYS.map((scope) => {
    const list = minimalCover(scans.get(scope)!.used.keys(), inherited(scope));
    return `  ${JSON.stringify(scope)}: ${JSON.stringify(list)},`;
  });
  return `\n제안 목록(스캔 결과):\n${lines.join("\n")}`;
}

describe("client message scopes", () => {
  it("import 가 전부 풀리고, 네임스페이스는 정적으로 읽힌다", () => {
    const problems = [...scans.values()].flatMap((scan) => [...scan.problems]);
    expect([...unresolved, ...problems]).toEqual([]);
  });

  it("스코프마다 자기 레이아웃이 있고 그 스코프를 싣는다", () => {
    const missing = SCOPE_KEYS.filter((scope) => {
      const layout = path.join(scopeDir(scope), "layout.tsx");
      if (!fs.existsSync(layout)) return true;
      const source = fs.readFileSync(layout, "utf8");
      return scope === "root"
        ? !source.includes("CLIENT_MESSAGE_SCOPES.root")
        : !source.includes(JSON.stringify(scope));
    });
    expect(missing).toEqual([]);
  });

  it("클라이언트가 여는 네임스페이스는 전부 실려 있다", () => {
    const gaps: string[] = [];
    for (const scope of SCOPE_KEYS) {
      const available = visibleNamespaces(scope);
      for (const [namespace, files] of scans.get(scope)!.used) {
        if (!available.some((e) => covers(e, namespace))) {
          gaps.push(`${scope}: ${namespace} (${[...files].join(", ")})`);
        }
      }
    }
    expect(gaps, gaps.join("\n") + suggestion()).toEqual([]);
  });

  it("안 쓰는 항목·부모가 이미 실은 항목이 없다", () => {
    const extras: string[] = [];
    for (const scope of SCOPE_KEYS) {
      const own = SCOPES[scope];
      const used = [...scans.get(scope)!.used.keys()];
      const fromParents = inherited(scope);
      own.forEach((entry, i) => {
        if (!used.some((n) => covers(entry, n))) extras.push(`${scope}: ${entry} 안 씀`);
        if (fromParents.some((e) => covers(e, entry))) extras.push(`${scope}: ${entry} 부모가 이미 실음`);
        if (own.some((other, j) => j !== i && overlaps(other, entry))) {
          extras.push(`${scope}: ${entry} 목록 안에서 겹침`);
        }
      });
    }
    expect(extras, extras.join("\n") + suggestion()).toEqual([]);
  });

  it("목록의 네임스페이스는 카탈로그에 있다", () => {
    const missing = SCOPE_KEYS.flatMap((scope) =>
      SCOPES[scope].filter(
        (entry) => Object.keys(pickMessages(ko as unknown as AbstractIntlMessages, [entry])).length === 0,
      ),
    );
    expect(missing).toEqual([]);
  });

  it("프로바이더 밖 문서(app/not-found·global-error)의 클라이언트는 메시지를 쓰지 않는다", () => {
    const { used } = clientNamespaces([
      path.join("app", "not-found.tsx"),
      path.join("app", "global-error.tsx"),
    ]);
    expect([...used.keys()]).toEqual([]);
  });

  it("NextIntlClientProvider 는 루트 레이아웃과 스코프 프로바이더에서만 연다", () => {
    const allowed = [path.join(APP, "layout.tsx"), path.join("i18n", "scoped-intl-provider.tsx")];
    const offenders = ["app", "components", "modules", "lib", "hooks", "i18n"]
      .flatMap(sourceFiles)
      .filter((file) => !allowed.includes(file))
      .filter((file) => fs.readFileSync(file, "utf8").includes("<NextIntlClientProvider"));
    expect(offenders).toEqual([]);
  });
});

describe("pickMessages / scopeMessages / mergeMessages", () => {
  const catalog = { a: { x: "1", y: { z: "2" } }, b: "3", c: { d: "4" } };

  it("하위 경로를 같은 모양으로 뽑고, 없는 경로는 건너뛴다", () => {
    expect(pickMessages(catalog, ["a.y", "b", "nope.q"])).toEqual({ a: { y: { z: "2" } }, b: "3" });
  });

  it("스코프 사슬을 합치면 보이는 네임스페이스가 빠짐없이, 한 번씩만 실린다", () => {
    const catalog = ko as unknown as AbstractIntlMessages;
    for (const scope of SCOPE_KEYS) {
      const chain: ClientMessageScope[] = [];
      for (let s: ClientMessageScope | null = scope; s; s = parentScope(s)) chain.unshift(s);
      const shipped = chain.map((s) => scopeMessages(catalog, s));
      const merged = shipped.reduce(mergeMessages, {});
      for (const namespace of visibleNamespaces(scope)) {
        expect(pickMessages(merged, [namespace]), `${scope}: ${namespace}`).toEqual(
          pickMessages(catalog, [namespace]),
        );
      }
      expect(shipped.reduce((n, m) => n + leafCount(m), 0), scope).toBe(leafCount(merged));
    }
  });

  it("부모 위에 자식을 얹되 같은 네임스페이스의 하위 경로끼리 합친다", () => {
    const merged = mergeMessages({ a: { x: "1" }, b: "3" }, { a: { y: { z: "2" } }, c: { d: "4" } });
    expect(merged).toEqual(catalog);
  });
});
