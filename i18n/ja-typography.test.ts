import { describe, expect, it } from "vitest";
import ja from "@/messages/ja.json";

function flatten(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => flatten(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k));
  }
  return [];
}

const STRINGS = flatten(ja);
const JP = "[\\u3040-\\u30ff\\u3400-\\u9fff]";
const UNIT =
  "(?:時間|日間|日|件|分|秒|回|人|文字|個|週間|週|か月|ヶ月|年|行|枚|本|名|倍|円|ページ|項目|種類|段階|桁|語|通|点|位|歳|色|列|つ|番目|MB|KB|GB)";
const PARTICLE = "(?:の|に|を|が|で|は|と|へ|から|まで|より|や|以内|以上|以下|ごと)";
const NUM = "(?:\\d[\\d,.〜~\\-]*|\\{[^{}]+\\}|#)";

function offenders(pattern: RegExp, allow: string[] = []) {
  return STRINGS.filter(([path, value]) => !allow.includes(path) && pattern.test(value)).map(([path, value]) => `${path}: ${value}`);
}

describe("ja messages read as written in Japanese, not carried over from Korean", () => {
  it("never puts a space between a number and its unit or particle (24 時間 → 24時間)", () => {
    expect(offenders(new RegExp(`(?<![A-Za-z\\d])${NUM}[ \\u00a0]+(?=${UNIT}|${PARTICLE})`))).toEqual([]);
    expect(offenders(new RegExp(`${JP}[ \\u00a0]+(?=${NUM}[ \\u00a0]*${UNIT})`))).toEqual([]);
  });

  it("uses the Japanese ellipsis and full-width colon after 例", () => {
    expect(offenders(/\.\.\./)).toEqual([]);
    expect(offenders(/例:/)).toEqual([]);
  });

  it("does not use Korean-only word choices", () => {
    expect(offenders(/悪性/)).toEqual([]);
    expect(offenders(/[가-힣]/, ["languageSwitcher.ko"])).toEqual([]);
  });

  it("names LINE before KakaoTalk wherever both appear", () => {
    const misordered = STRINGS.filter(
      ([, value]) => value.includes("LINE") && value.includes("カカオ") && value.indexOf("カカオ") < value.indexOf("LINE"),
    );
    expect(misordered.map(([path]) => path)).toEqual([]);
  });
});
