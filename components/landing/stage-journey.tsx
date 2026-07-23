"use client";

/**
 * Stage scene 1 — "링크의 여정" 서곡 (vault: kurl-web-stage-design P1 의 파일럿 슬라이스).
 *
 * 히어로 폼(여정의 출발점)과 LandingPreviews 사이에서, 그린 실이 폼 쪽에서 아래로 자라며
 * 단축 결과물(알약)이 물질화되고 첫 클릭 맥박이 도착하는 장면. 폼 위를 지나는 형광-스윕은
 * page.tsx 의 `.stage-sweep-host` 가 담당한다(순수 CSS, 루트 스크롤 연동).
 *
 * 전부 장식(aria-hidden)이다 — kurl_stage 플래그 off(기본)면 아예 마운트되지 않고,
 * 스크롤 연동 미지원 브라우저는 완성 상태 정지화면을, reduced-motion 도 동일한 정지화면을 본다.
 * 알약 텍스트는 로케일 무관 브랜드 리터럴("kurl.me/…")이라 i18n 대상이 아니다.
 */
export function StageJourney() {
  return (
    <div aria-hidden className="hidden justify-center bg-white pb-4 dark:bg-slate-950 sm:flex">
      <div className="flex flex-col items-center">
        <div className="stage-thread h-24 w-[2px] rounded-full bg-gradient-to-b from-accent-300/0 via-accent-500/70 to-accent-600 sm:h-32" />
        <div className="stage-pill relative mt-3">
          <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-accent-600/30 bg-accent-50 px-3.5 py-1.5 font-mono text-[12px] tracking-tight text-accent-700 dark:border-accent-400/30 dark:bg-accent-900/40 dark:text-accent-400">
            <span className="relative flex h-1.5 w-1.5 items-center justify-center">
              <span className="stage-pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent-500 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-600 dark:bg-accent-400" />
            </span>
            kurl.me/&hellip;
          </span>
        </div>
      </div>
    </div>
  );
}
