#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "quality-baseline.json");
const LINT_TARGETS = ["app", "components", "hooks", "i18n", "lib", "modules", "types", "middleware.ts"];

const APP_PRIVATE = {
  group: ["@/app/**/_components/**", "@/app/**/_lib/**"],
  message: "A route's _components/_lib belong to that route; move shared code out of app/.",
};
const FEATURE_MODULES = {
  group: ["@/modules/**"],
  message: "The shared layer (components, lib, hooks) must not depend on feature modules.",
};
const REDUCED_MOTION_QUERY = {
  selector: "CallExpression[callee.property.name='matchMedia'][arguments.0.value=/prefers-reduced-motion/]",
  message: "Use prefersReducedMotion() or useReducedMotion() from @/hooks/use-reduced-motion.",
};

const HISTORY_PATTERNS = [
  /#(?!0+\b)\d{3,4}\b/,
  /예전엔|예전에는|이전엔|이전에는|폐기/,
  /\b[Pp]reviously\b/,
  /Replaces the previous/,
  /적대 검증/,
  /(?<!\b(?:is|are|was|were|be|been|being|only|also|just|and)\s)(?<![,—–-]\s)\bused to\b/,
];

export function isHistoryComment(text) {
  return HISTORY_PATTERNS.some((pattern) => pattern.test(text));
}

const noHistoryComment = {
  meta: {
    type: "suggestion",
    messages: { history: "History belongs in the commit message or PR body, not in a comment." },
    schema: [],
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const comment of source.getAllComments()) {
          if (isHistoryComment(comment.value)) context.report({ loc: comment.loc, messageId: "history" });
        }
      },
    };
  },
};

export function createLinter() {
  return new ESLint({
    cwd: ROOT,
    useEslintrc: false,
    allowInlineConfig: false,
    extensions: [".ts", ".tsx"],
    plugins: { ratchet: { rules: { "no-history-comment": noHistoryComment } } },
    overrideConfig: {
      plugins: ["ratchet"],
      parser: "@typescript-eslint/parser",
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
      rules: {
        "ratchet/no-history-comment": "error",
        "no-restricted-syntax": ["error", REDUCED_MOTION_QUERY],
      },
      overrides: [
        {
          files: ["*.ts", "*.tsx"],
          excludedFiles: ["app/**"],
          rules: { "no-restricted-imports": ["error", { patterns: [APP_PRIVATE] }] },
        },
        {
          files: ["components/**", "lib/**", "hooks/**"],
          rules: { "no-restricted-imports": ["error", { patterns: [APP_PRIVATE, FEATURE_MODULES] }] },
        },
        {
          files: ["hooks/use-reduced-motion.ts"],
          rules: { "no-restricted-syntax": "off" },
        },
      ],
    },
  });
}

function eslintKeys(results) {
  return results.flatMap((result) =>
    result.messages.map((m) => {
      if (!m.ruleId) throw new Error(`${result.filePath}: ${m.message}`);
      const detail = m.ruleId === "no-restricted-imports" ? (m.message.match(/^'([^']+)'/)?.[1] ?? m.message) : "";
      return `eslint:${m.ruleId}|${path.relative(ROOT, result.filePath)}|${detail}`;
    }),
  );
}

export async function lintSource(text, filePath) {
  return eslintKeys(await createLinter().lintText(text, { filePath: path.join(ROOT, filePath) }));
}

async function collectEslint() {
  return eslintKeys(await createLinter().lintFiles(LINT_TARGETS));
}

const KNIP_KINDS = ["files", "dependencies", "devDependencies", "unlisted", "unresolved", "exports", "types", "duplicates", "enumMembers"];

function collectKnip() {
  const out = execFileSync(path.join(ROOT, "node_modules/.bin/knip"), ["--reporter", "json", "--no-exit-code"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const keys = [];
  for (const issue of JSON.parse(out).issues) {
    for (const kind of KNIP_KINDS) {
      const found = issue[kind];
      const items = Array.isArray(found) ? found : Object.values(found ?? {});
      for (const item of items) {
        const name = Array.isArray(item) ? item.map((i) => i.name).join(",") : item.name;
        keys.push(`knip:${kind}|${issue.file}|${name}`);
      }
    }
  }
  return keys;
}

export function tally(keys) {
  const counts = {};
  for (const key of [...keys].sort()) counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}

export function compare(baseline, current) {
  const grown = [];
  const shrunk = [];
  for (const key of new Set([...Object.keys(baseline), ...Object.keys(current)])) {
    const before = baseline[key] ?? 0;
    const now = current[key] ?? 0;
    if (now > before) grown.push(`${key}  (${before} → ${now})`);
    else if (now < before) shrunk.push(`${key}  (${before} → ${now})`);
  }
  return { grown: grown.sort(), shrunk: shrunk.sort() };
}

async function main(mode) {
  const current = tally([...collectKnip(), ...(await collectEslint())]);
  if (mode === "update") {
    writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
    console.log(`quality-baseline.json: ${Object.values(current).reduce((a, b) => a + b, 0)} entries`);
    return;
  }
  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  const { grown, shrunk } = compare(baseline, current);
  if (shrunk.length > 0) {
    console.log(`Fixed ${shrunk.length} baselined issue(s). Run \`npm run quality:update\` to lock the gain in:`);
    for (const line of shrunk) console.log(`  - ${line}`);
  }
  if (grown.length > 0) {
    console.error(`New quality issues (${grown.length}). Fix them; the baseline only shrinks:`);
    for (const line of grown) console.error(`  + ${line}`);
    process.exitCode = 1;
    return;
  }
  console.log("Quality ratchet: no new issues.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main(process.argv[2] ?? "check");
}
