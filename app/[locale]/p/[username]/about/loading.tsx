import { Skeleton } from "@/modules/blog/components/skeleton";
import { SrLoading } from "@/modules/blog/components/sr-loading";

/**
 * About-tab content skeleton (bio prose + stats), on the centered column. The header (identity + tabs)
 * is held by the persistent layout (ProfileChrome), so this fallback is content-only — the header
 * stays put while the bio streams in.
 */
export default function AboutLoading() {
  return (
    <div className="mx-auto mt-8 max-w-2xl" aria-busy>
      <SrLoading />
      <div className="space-y-3">
        {["w-full", "w-[95%]", "w-[88%]", "w-[72%]"].map((w, i) => (
          <Skeleton key={i} className={`h-4 ${w}`} />
        ))}
      </div>
      <Skeleton className="mt-10 h-32 w-full rounded-xl" />
    </div>
  );
}
