import { linksHref } from "@/lib/host";

export default function BlogLinksPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">글 안 링크</h1>
      <p className="mt-3 text-sm text-slate-500">
        이 페이지는 본문 안에 박힌 링크들의 성과를 작가 시점으로 보여준다. 곧.
      </p>
      <a
        href={linksHref("/dashboard")}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        전체 링크 대시보드에서 보기 →
      </a>
    </div>
  );
}
