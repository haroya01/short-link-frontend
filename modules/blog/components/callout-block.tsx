import { useTranslations } from "next-intl";
import { Info, Lightbulb, OctagonAlert, Star, TriangleAlert, type LucideIcon } from "lucide-react";
import { Markdown } from "@/modules/blog/components/markdown";
import type { CalloutKind } from "@/modules/blog/lib/callout";

const LOOK: Record<CalloutKind, { icon: LucideIcon; box: string; accent: string }> = {
  note: { icon: Info, box: "border-sky-300 bg-sky-50/70 dark:border-sky-500/50 dark:bg-sky-500/10", accent: "text-sky-700 dark:text-sky-300" },
  tip: { icon: Lightbulb, box: "border-cyan-300 bg-cyan-50/70 dark:border-cyan-500/50 dark:bg-cyan-500/10", accent: "text-cyan-700 dark:text-cyan-300" },
  important: { icon: Star, box: "border-violet-300 bg-violet-50/70 dark:border-violet-500/50 dark:bg-violet-500/10", accent: "text-violet-700 dark:text-violet-300" },
  warning: { icon: TriangleAlert, box: "border-amber-300 bg-amber-50/70 dark:border-amber-500/50 dark:bg-amber-500/10", accent: "text-amber-700 dark:text-amber-300" },
  caution: { icon: OctagonAlert, box: "border-rose-300 bg-rose-50/70 dark:border-rose-500/50 dark:bg-rose-500/10", accent: "text-rose-700 dark:text-rose-300" },
};

export function CalloutBlock({ kind, body }: { kind: CalloutKind; body: string }) {
  const t = useTranslations("publicPost.callout");
  const { icon: Icon, box, accent } = LOOK[kind];
  return (
    <aside role="note" data-callout={kind} className={`my-6 rounded-lg border-l-4 px-5 py-4 [&>p:last-child]:mb-0 ${box}`}>
      <div className={`mb-1.5 flex items-center gap-1.5 text-[14px] font-semibold ${accent}`}>
        <Icon className="h-4 w-4" aria-hidden />
        {t(kind)}
      </div>
      {body ? <Markdown>{body}</Markdown> : null}
    </aside>
  );
}
