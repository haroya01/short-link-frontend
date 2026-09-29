import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * 오류 문구 가드 — 서버 detail("internal server error")과 JS 오류 메시지("Failed to fetch")는
 * 영어 기술 문구라 화면에 올리지 않는다. 화면 문구는 useApiErrorMessage(번역된 코드 → 번역문,
 * 아니면 부른 쪽의 대체 문구)로만 만든다. 관리자 화면은 운영자용이라 밖.
 */
const ROOTS = ["app", "components", "modules", "hooks"];
const EXCLUDED = /(\.test\.|[\\/]admin[\\/])/;
const PATTERN = /\b(e|err|error|ex)\.message\b/;
// 읽기만 하고 화면엔 안 쓰는 자리: Apple 팝업 취소 판별, 검증 문구를 번역 함수에 넘기는 줄.
const ALLOW_FILE = /apple-sign-in-button\.tsx$/;
const ALLOW_LINE = /translateValidation\(/;

function filesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(file);
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

describe("error copy guard", () => {
  it("화면 코드가 오류 원문(.message)을 쓰지 않는다", () => {
    const hits: string[] = [];
    for (const file of ROOTS.flatMap(filesUnder)) {
      if (EXCLUDED.test(file) || ALLOW_FILE.test(file)) continue;
      fs.readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (PATTERN.test(line) && !ALLOW_LINE.test(line)) hits.push(`${file}:${i + 1} ${line.trim().slice(0, 120)}`);
        });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
