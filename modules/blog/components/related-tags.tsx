import { blogPath } from "@/lib/host";
import type { RelatedTag } from "@/modules/blog/api/public-posts";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { isDisplayableTag } from "@/modules/blog/lib/tag-normalize";
import { cn } from "@/lib/utils";

export function RelatedTags({
  tags,
  label,
  className,
  onPick,
}: {
  tags: RelatedTag[];
  label: string;
  className?: string;
  onPick?: () => void;
}) {
  const shown = tags.filter((related) => isDisplayableTag(related.tag));
  if (shown.length === 0) return null;
  return (
    <ul aria-label={label} data-testid="related-tags" className={cn("flex flex-wrap gap-x-4 gap-y-1.5", className)}>
      {shown.map((related) => (
        <li key={related.tag}>
          <BlogLink
            href={blogPath(`/tags/${encodeURIComponent(related.tag)}`)}
            onClick={onPick}
            className="focus-ring rounded text-[14px] text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
            data-bhv="tag"
            data-bhv-id={related.tag}
          >
            #{related.tag}
          </BlogLink>
        </li>
      ))}
    </ul>
  );
}
