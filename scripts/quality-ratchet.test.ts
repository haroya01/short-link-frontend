// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compare, isHistoryComment, lintSource, tally } from "./quality-ratchet.mjs";

const rules = (keys: string[]) => keys.map((key) => key.split("|")[0]);

describe("route-private imports", () => {
  const source = 'import { PhotoLightbox } from "@/app/[locale]/u/[username]/_components/photo-lightbox";\n';

  it("flags app/**/_components imported from outside app/", async () => {
    expect(await lintSource(source, "modules/notes/components/x.tsx")).toEqual([
      "eslint:no-restricted-imports|modules/notes/components/x.tsx|@/app/[locale]/u/[username]/_components/photo-lightbox",
    ]);
    expect(rules(await lintSource('import { t } from "@/app/[locale]/u/[username]/_lib/theme";\n', "lib/x.ts"))).toEqual([
      "eslint:no-restricted-imports",
    ]);
  });

  it("allows it inside app/", async () => {
    expect(await lintSource(source, "app/[locale]/u/[username]/page.tsx")).toEqual([]);
  });
});

describe("shared layer must not reach into feature modules", () => {
  const source = 'import { BlogLink } from "@/modules/blog/components/blog-link";\n';

  it.each(["components/common/x.tsx", "lib/x.ts", "hooks/use-x.ts"])("flags %s", async (file) => {
    expect(rules(await lintSource(source, file))).toEqual(["eslint:no-restricted-imports"]);
  });

  it("lets feature modules and routes import each other", async () => {
    expect(await lintSource(source, "modules/notes/components/x.tsx")).toEqual([]);
    expect(await lintSource(source, "app/[locale]/blog/page.tsx")).toEqual([]);
  });
});

describe("reduced-motion queries go through the hook module", () => {
  const sources = [
    'const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n',
    'const r = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;\n',
  ];

  it.each(sources)("flags a direct query: %s", async (source) => {
    expect(rules(await lintSource(source, "modules/blog/components/x.tsx"))).toEqual(["eslint:no-restricted-syntax"]);
  });

  it("allows the hook module itself and unrelated media queries", async () => {
    expect(await lintSource(sources[0], "hooks/use-reduced-motion.ts")).toEqual([]);
    expect(await lintSource('window.matchMedia("(pointer: coarse)");\n', "modules/x.ts")).toEqual([]);
  });

  it("can't be silenced with an inline disable", async () => {
    const source = `// eslint-disable-next-line no-restricted-syntax\n${sources[0]}`;
    expect(rules(await lintSource(source, "modules/x.ts"))).toEqual(["eslint:no-restricted-syntax"]);
  });
});

describe("history comments", () => {
  it.each([
    "the header used to be a server prop",
    "(#891) 카드 문법",
    "see PR #105",
    "예전엔 동의 상태를 읽는 코드가",
    "사이드바 IA 폐기",
    "Previously these were inline",
    "Replaces the previous Toast UI editor",
    "(적대 검증 r4)",
  ])("flags %s", (text) => {
    expect(isHistoryComment(text)).toBe(true);
  });

  it.each([
    "the first paragraph — used to pre-fill the excerpt",
    "the source image, used to reserve layout space",
    "init is only used to seed the entry",
    "shown in step 2 and used to name a new path",
    "`.device-screen { background: #000 }`",
    "Must match the exit class's animation duration.",
  ])("leaves %s alone", (text) => {
    expect(isHistoryComment(text)).toBe(false);
  });

  it("reports through the linter", async () => {
    expect(await lintSource("// It used to be a blocking stylesheet.\nexport {};\n", "lib/x.ts")).toEqual([
      "eslint:ratchet/no-history-comment|lib/x.ts|",
    ]);
  });
});

describe("baseline comparison", () => {
  const baseline = tally(["a", "b", "b"]);

  it("fails a new key or a grown count", () => {
    expect(compare(baseline, tally(["a", "b", "b", "c"])).grown).toEqual(["c  (0 → 1)"]);
    expect(compare(baseline, tally(["a", "a", "b", "b"])).grown).toEqual(["a  (1 → 2)"]);
  });

  it("reports a shrunk count without failing", () => {
    expect(compare(baseline, tally(["a", "b"]))).toEqual({ grown: [], shrunk: ["b  (2 → 1)"] });
  });
});
