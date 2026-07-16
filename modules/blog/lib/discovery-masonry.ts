/**
 * 발견 피드 메이슨리의 순수 배치 로직 — 컴포넌트(discovery-card.tsx)와 테스트가 공유한다. React 의존이
 * 없어 단위 테스트가 가볍다.
 */

// Tailwind 브레이크포인트와 일치: <640 = 1열, <1024 = 2열, ≥1024 = 3열.
export const BP_SM = 640;
export const BP_LG = 1024;
export const MAX_COLUMNS = 3;
// 서버·첫 클라 렌더는 1열(모바일 우선). 폭을 모르는 SSR 에서 3열을 그리면 모바일 첫 페인트가 1/3 폭으로
// 짜부라졌다 1열로 튀는 깜빡임 — 1열 SSR 은 전 폭 안전, 데스크톱만 마운트 후 3열로 한 번 재배치.
export const SSR_COLUMNS = 1;

export function columnsForWidth(w: number): number {
  if (w < BP_SM) return 1;
  if (w < BP_LG) return 2;
  return MAX_COLUMNS;
}

/**
 * 문서순 → 열 배치. heights 가 있으면(마운트 후) 최단열 greedy, 없으면(SSR/첫 렌더) 라운드로빈. 둘 다
 * 결정적이라 heights 없는 동안 서버·클라 마크업이 일치한다.
 *
 * **prefix-stable**: i 번째 셀의 배치는 0..i-1 의 배치·높이에만 의존한다. 뒤에 셀이 붙어도(무한스크롤
 * append) 앞 셀들의 배치는 절대 바뀌지 않는다 — 그래서 청크 없이 단일 컨테이너로 둬도 append 시 이미
 * 보이던 카드가 재배치되지 않는다(예전 페이지-청크 세로 스택이 만들던 경계 이음새를 제거한 근거).
 *
 * spread(특수 카드: 연결·시리즈 삽입)는 greedy 로 자유 재배치하지 않는다 — 크고(포스트 2~3배 높이)
 * 문서상 서로 가까워, greedy 에 맡기면 같은 열에 뭉친다. 대신 직전 특수 카드가 쓴 열을 피해 최단열로
 * 흩뿌려 서로 다른 열에 짜여 들게 한다. 일반 포스트는 그대로 최단열 greedy 로 채운다.
 */
export function distribute(
  count: number,
  cols: number,
  heights: number[] | null,
  isSpread: (i: number) => boolean,
): number[][] {
  const buckets: number[][] = Array.from({ length: cols }, () => []);
  const colH = new Array(cols).fill(0);
  const shortest = (avoid: number) => {
    let min = -1;
    for (let c = 0; c < cols; c++) {
      if (c === avoid && cols > 1) continue;
      if (min === -1 || colH[c] < colH[min]) min = c;
    }
    return min === -1 ? 0 : min;
  };
  let lastSpreadCol = -1;
  for (let i = 0; i < count; i++) {
    let target: number;
    if (!heights) {
      // SSR/첫 렌더: 결정적 라운드로빈(특수 카드도 동일 — 하이드레이션 일치가 최우선).
      target = i % cols;
    } else if (isSpread(i)) {
      // 특수 카드: 최단열에 넣되 직전 특수 카드가 쓴 열은 피해 서로 다른 열로 흩뿌린다.
      target = shortest(lastSpreadCol);
      lastSpreadCol = target;
    } else {
      // 일반 포스트: 순수 최단열 greedy.
      target = shortest(-1);
    }
    buckets[target].push(i);
    if (heights) colH[target] += heights[i] ?? 0;
  }
  return buckets;
}
