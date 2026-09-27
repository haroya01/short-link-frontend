/**
 * 챕터 머리 — 랜딩 히어로의 약속("누가, 언제, 어디서")을 실제 통계 화면의 목차로 그대로 편성한
 * 3장 구조의 표지. mono 장번호 + 제목, 장식 없음(§10).
 */
export function ChapterHeading({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-slate-100 pb-2.5 dark:border-slate-800">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-tagline text-accent-700 dark:text-accent-400">
        {String(index).padStart(2, "0")}
      </span>
      <h2 className="text-[17px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
        {title}
      </h2>
    </div>
  );
}
