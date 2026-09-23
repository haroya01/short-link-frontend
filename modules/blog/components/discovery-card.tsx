"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { SSR_COLUMNS, columnsForWidth, distribute } from "@/modules/blog/lib/discovery-masonry";

// 메이슨리 — 카드를 크기대로 빈틈없이 퍼즐처럼 채운다(행 강제 정렬 X, 밑 여백 들쭉날쭉 회피).
// 모바일 1열 → sm 2열 → lg 3열(md 태블릿 세로에서 3열이면 카드가 ~250px로 짜부라져 2열 유지).
// 모바일이 1열인 또 다른 이유는 2열에서 한글 제목이 ~8자에 잘려서다.
//
// 구현: CSS multi-column(column-fill:balance) 을 버리고 flex 컬럼 + 측정 기반 최단열 배치로 바꿨다.
// balance 는 큰 카드(예: "지금 이어지는 것들" 연결 카드)가 한 열에 들어가면 그 열만 크게 늘어나고
// 다른 열 밑을 통째로 비워(사용자 신고: "카드 없는 빈 공간") — 아이템을 쪼갤 수 없는(break-inside)
// 큰 타일이 열 경계에서 다음 열로 튀며 남기는 void 다. flex 컬럼은 각 열이 독립 스택이라 큰 카드는
// 자기 열 밑만 길어질 뿐(정상 메이슨리의 들쭉 밑변) void 를 안 만든다. 마운트 후 실제 높이를 재
// 최단열에 순서대로 넣어 높이까지 고르게 맞춘다. 전 아이템을 단일 컨테이너로 배치한다(예전의 페이지
// 단위 청크는 경계마다 가로 이음새를 만들어 폐기 — DiscoveryGrid 주석 참조. greedy 는 prefix-stable 라
// 청크 없이도 append 재배치가 없다).
// 순수 배치 로직(열 수·greedy·spread)은 modules/blog/lib/discovery-masonry 로 뺐다(단위 테스트 공유).

export function DiscoveryGrid({ children }: { children: ReactNode }) {
  // 전 아이템을 단일 메이슨리로 배치한다 — 페이지 단위로 컬럼 블록을 끊어 세로로 쌓던 예전 방식은
  // 각 블록 높이가 그 블록의 최장 열이라, 페이지 경계마다 짧은 열 밑에 빈 사각 공간이 생기고 다음
  // 묶음이 평평한 수평선에서 시작했다(사장님 "페이지네이션 지점 자로 댄 절단" 신고). 청크는 원래 CSS
  // multicol(column-fill:balance)이 append 마다 전체를 재분배해 앞 카드를 뒤섞는 걸 막으려던 것인데,
  // 지금의 최단열 greedy 는 prefix-stable — i 번째 배치가 0..i-1 에만 의존하므로 뒤에 카드가 붙어도
  // 앞 카드 배치는 불변이다. 그래서 청크 없이 한 컨테이너로 둬도 append 재배치가 없고, 경계 이음새도
  // 사라진다.
  return <MasonryChunk>{children}</MasonryChunk>;
}

/** 그리드 전체 카드를 flex 컬럼 메이슨리로 배치. SSR/첫 렌더는 라운드로빈(결정적, void 없음), 마운트
 *  후 실제 셀 높이를 재 최단열로 재배치해 열 높이를 고르게 맞춘다. greedy 가 prefix-stable 라(배치가
 *  앞 셀에만 의존) 무한스크롤 append 시 앞 카드는 재배치되지 않는다. */
function MasonryChunk({ children }: { children: ReactNode }) {
  const cells = Children.toArray(children);
  // 특수 카드(DiscoveryCell spread) 위치 — 배치에서 greedy 자유이동 대신 열 흩뿌림으로 다룬다.
  const spreadSet = new Set<number>();
  cells.forEach((cell, i) => {
    if (isValidElement(cell) && cell.type === DiscoveryCell && cell.props?.spread) spreadSet.add(i);
  });
  const [cols, setCols] = useState(SSR_COLUMNS);
  const [heights, setHeights] = useState<number[] | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 뷰포트 폭 → 열 수. 리사이즈(브레이크포인트 통과)마다 재계산.
  useEffect(() => {
    const apply = () => setCols(columnsForWidth(window.innerWidth));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  // 셀 실제 높이 측정 → 최단열 배치. 리플로우로 노드가 열 사이를 옮겨다녀도 ref 는 원래 인덱스(i)에
  // 고정돼 있어, 매 렌더 현재 ref 들을 다시 관찰한다. 이미지·폰트 로드로 높이가 늦게 바뀌므로
  // ResizeObserver 로 추적하고, 값이 실제로 바뀔 때만 setHeights 해 리플로우 루프를 끊는다.
  const cellCount = cells.length;
  useEffect(() => {
    const measure = () => {
      const nodes = cellRefs.current;
      const hs: number[] = [];
      for (let i = 0; i < cellCount; i++) hs[i] = nodes[i]?.getBoundingClientRect().height ?? 0;
      // 아직 아무 셀도 실측되지 않았으면(전부 0) 라운드로빈 유지 — 0 을 높이로 믿어 한 열에 몰지 않는다.
      if (hs.every((h) => h === 0)) return;
      setHeights((prev) =>
        prev && prev.length === hs.length && prev.every((h, i) => Math.abs(h - hs[i]) < 1) ? prev : hs,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (let i = 0; i < cellCount; i++) {
      const n = cellRefs.current[i];
      if (n) ro.observe(n);
    }
    return () => ro.disconnect();
    // cols·cellCount 이 바뀌면 열 폭/셀 수가 달라져 재측정. buckets 변화는 같은 노드 재관찰이라 불필요.
  }, [cellCount, cols]);

  const buckets = distribute(cells.length, cols, heights, (i) => spreadSet.has(i));
  // flex 컬럼: 각 열이 독립 세로 스택 → 큰 카드가 자기 열만 늘리고 다른 열에 void 를 안 만든다.
  // items-start: 기본 stretch 는 짧은 열을 가장 긴 열 높이로 늘려 카드 밑에 빈 칸을 만든다 — 각 열이
  // 콘텐츠 자연 높이만 갖게 해 밑변만 들쭉날쭉(정상 메이슨리)하게 둔다.
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      {buckets.map((idxs, c) => (
        <div key={c} className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5">
          {idxs.map((i) => (
            <div
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
            >
              {cells[i]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A child cell of {@link DiscoveryGrid}. 카드 간격은 이제 flex 컬럼의 gap 이 준다(예전 CSS columns
 *  의 mb + break-inside-avoid 는 flex 메이슨리에선 불필요 — 제거). `entranceDelay` 가 오면 마운트 시
 *  짧은 스태거 페이드(fill backwards — 딜레이 동안 안 보이게). 무한스크롤 append 가 "뚝" 나타나는 걸
 *  지우는 용도 — 이미 마운트된 카드는 다시 돌지 않고, reduced-motion 은 globals 의 animate-fade-in
 *  가드가 통째로 끈다. */
export function DiscoveryCell({
  children,
  entranceDelay,
  spread,
}: {
  children: ReactNode;
  entranceDelay?: number;
  /** 특수 카드(연결·시리즈 삽입)를 표시 — 최단열 greedy 로 자유 재배치하지 않고, 문서순대로 서로 다른
   *  열에 흩뿌려(spread) 한 열에 뭉치지 않게 한다. MasonryChunk 가 이 플래그를 읽어 배치를 가른다.
   *  값은 배치 로직에서만 쓰이고 DOM 에는 남지 않는다. */
  spread?: boolean;
}) {
  void spread;
  return (
    <div
      className={entranceDelay != null ? "animate-fade-in" : undefined}
      style={
        entranceDelay != null
          ? { animationDelay: `${entranceDelay}ms`, animationFillMode: "backwards" }
          : undefined
      }
    >
      {children}
    </div>
  );
}

// 로딩 placeholder — 리스트 행이 아니라 실제 카드 그리드와 같은 메이슨리 모양으로(높이 섞인 카드 블록)
// 채워, 전환이 "같은 그리드가 채워지는" 느낌이 되게 한다. 비율을 섞어 메이슨리 packing 을 흉내.
const SKELETON_RATIOS = [
  "aspect-[4/5]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[4/3]",
];
export function DiscoveryGridSkeleton({ count = 6 }: { count?: number }) {
  // 로딩 플레이스홀더는 마운트 후에만 뜨므로(SSR 짜부라짐 무관) 반응형 CSS columns 로 간단히 그린다 —
  // 균일한 회색 블록이라 실제 그리드의 balance-gap 문제도 여기선 무해하다.
  return (
    <div role="status" aria-busy="true" className="columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-4 break-inside-avoid sm:mb-5">
          <div
            className={`w-full animate-pulse rounded-card-lg bg-slate-200/80 dark:bg-slate-800 ${SKELETON_RATIOS[i % SKELETON_RATIOS.length]}`}
          />
        </div>
      ))}
    </div>
  );
}
