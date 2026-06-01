import { Skeleton } from "@/modules/blog/components/skeleton";

/**
 * Link-in-bio profile skeleton — centered avatar + handle + bio, then a stack of entry-card
 * placeholders (rounded-2xl, matching the card wrapper). Keeps the page from flashing blank while
 * the profile fetches.
 */
export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-md px-4 py-10" aria-busy>
      <div className="flex flex-col items-center text-center">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
