"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "next-intl";

/** 통계 머리 위 뒤로 버튼. 라우트 로딩 상태는 문구 없이(같은 줄 높이) 그리고 페이지가 문구를 채운다. */
export function StatsBackButton({ label }: { label?: string }) {
  const router = useRouter();
  const locale = useLocale();
  return (
    <button
      onClick={() => {
        // Direct entry (no in-app history) leaves router.back() a no-op — fall back to the link
        // dashboard so the button always goes somewhere.
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(`/${locale}/dashboard`);
        }
      }}
      aria-hidden={label ? undefined : true}
      tabIndex={label ? undefined : -1}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label ?? "​"}
    </button>
  );
}
