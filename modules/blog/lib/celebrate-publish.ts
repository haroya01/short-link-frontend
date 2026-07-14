const FLAG = "kurl:celebrate-publish";

/**
 * 발행 축하 연출의 세션 계약. 에디터는 발행 성공 → 글 페이지로 하드 내비게이션하기 직전에 슬러그를
 * 찍고(stamp), 도착한 글 페이지가 자기 슬러그와 맞을 때만 1회 소비(consume)해 연출을 재생한다.
 * sessionStorage 라 탭이 닫히면 함께 사라지고, 소비 즉시 지워져 새로고침/뒤로가기에 재생되지 않는다.
 * 저장 불가(사파리 프라이빗 등)는 조용히 넘어간다 — 연출은 어시스트지 발행의 일부가 아니다.
 */
export function stampPublishCelebration(slug: string): void {
  try {
    sessionStorage.setItem(FLAG, slug);
  } catch {
    /* storage unavailable — skip the confetti, never the publish */
  }
}

/** 이 글(slug)에 예약된 축하가 있으면 지우고 true. 다른 글의 플래그는 남겨 둔다(그 글 도착 시 재생). */
export function consumePublishCelebration(slug: string): boolean {
  try {
    if (sessionStorage.getItem(FLAG) !== slug) return false;
    sessionStorage.removeItem(FLAG);
    return true;
  } catch {
    return false;
  }
}
