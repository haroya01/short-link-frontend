import { describe, expect, it } from "vitest";
import { columnsForWidth, distribute } from "./discovery-masonry";

const noSpread = (_i: number) => false;
/** i 셀이 어느 열에 들어갔는지 → 열 인덱스 배열(문서순). */
function placement(
  count: number,
  cols: number,
  heights: number[] | null,
  isSpread: (i: number) => boolean = noSpread,
): number[] {
  const buckets = distribute(count, cols, heights, isSpread);
  const col = new Array(count).fill(-1);
  buckets.forEach((idxs, c) => idxs.forEach((i) => (col[i] = c)));
  return col;
}

describe("discovery masonry — column count", () => {
  it("maps width to 1 / 2 / 3 columns at the breakpoints", () => {
    expect(columnsForWidth(390)).toBe(1);
    expect(columnsForWidth(639)).toBe(1);
    expect(columnsForWidth(640)).toBe(2);
    expect(columnsForWidth(1023)).toBe(2);
    expect(columnsForWidth(1024)).toBe(3);
    expect(columnsForWidth(1440)).toBe(3);
  });
});

describe("distribute — greedy is prefix-stable (append never reshuffles earlier cards)", () => {
  // 무한스크롤 append 를 흉내: 앞 N 개 높이는 고정, 뒤에 K 개가 붙는다. 앞 N 개 배치가 불변이어야
  // 페이지 로드 시 이미 보이던 카드가 안 튄다(청크 없이 단일 컨테이너로 둔 근거).
  it("placement of the first N cells is identical whether K more follow", () => {
    const base = [420, 200, 180, 650, 150, 210, 170, 300, 190, 240, 260, 150];
    const more = [300, 210, 500, 160, 180, 220, 170, 190];
    for (const cols of [1, 2, 3]) {
      const short = placement(base.length, cols, base);
      const long = placement(base.length + more.length, cols, [...base, ...more]);
      expect(long.slice(0, base.length)).toEqual(short);
    }
  });

  it("holds for a large feed grown page by page (24 → 48 → 72)", () => {
    const rand = (seed: number) => {
      // deterministic pseudo-heights
      let x = seed;
      return () => {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        return 140 + (x % 520);
      };
    };
    const gen = rand(7);
    const heights = Array.from({ length: 72 }, gen);
    const p24 = placement(24, 3, heights.slice(0, 24));
    const p48 = placement(48, 3, heights.slice(0, 48));
    const p72 = placement(72, 3, heights);
    expect(p48.slice(0, 24)).toEqual(p24);
    expect(p72.slice(0, 48)).toEqual(p48);
  });
});

describe("distribute — spread scatters special cards across columns", () => {
  it("two adjacent special cards do not land in the same column (3 cols)", () => {
    // posts around two special cards near each other in document order.
    const heights = [200, 200, 200, 520, 380, 200, 200, 200];
    const specials = new Set([3, 4]); // 두 특수 카드가 문서상 인접
    const col = placement(heights.length, 3, heights, (i) => specials.has(i));
    expect(col[3]).not.toBe(col[4]); // 서로 다른 열
  });

  it("a lone special card still lands in the shortest column", () => {
    // col heights before the special: fill col0/col1, leave col2 shortest.
    const heights = [500, 480, 100, 300];
    const col = placement(heights.length, 3, heights, (i) => i === 3);
    // after placing 500→c0, 480→c1, 100→c2, the special (i=3) goes to the shortest (c2).
    expect(col[3]).toBe(2);
  });
});

describe("distribute — SSR round-robin (no heights) is deterministic + prefix-stable", () => {
  it("assigns i % cols and stays stable on append", () => {
    const col24 = placement(24, 3, null);
    const col48 = placement(48, 3, null);
    expect(col24).toEqual(Array.from({ length: 24 }, (_, i) => i % 3));
    expect(col48.slice(0, 24)).toEqual(col24);
  });
});
