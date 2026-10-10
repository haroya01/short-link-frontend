import { cn } from "@/lib/utils";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { Avatar } from "@/modules/blog/components/avatar";
import { END_SECTION } from "@/modules/blog/components/end-section";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { authorHref } from "@/modules/blog/lib/author-href";

export function PostAuthorCard({
  author,
  locale,
  postId,
  className,
}: {
  author: PublicAuthor;
  locale: string;
  postId: number;
  className?: string;
}) {
  const name = author.displayName?.trim();
  return (
    <section data-testid="post-author-card" className={cn(END_SECTION, className)}>
      <div className="flex items-start gap-4">
        <a
          href={authorHref(author.username, locale)}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded focus-ring"
          data-bhv="profile"
          data-bhv-id={author.username}
        >
          <Avatar src={author.avatarUrl} name={author.username} size="lg" />
          <span className="min-w-0">
            <span className="flex min-w-0 items-baseline gap-1.5">
              {name && (
                <span className="max-w-[70%] shrink-0 truncate text-[15px] font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400">
                  {name}
                </span>
              )}
              <span
                className={
                  name
                    ? "min-w-0 truncate text-[13px] text-slate-500 dark:text-slate-400"
                    : "min-w-0 truncate text-[15px] font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400"
                }
              >
                @{author.username}
              </span>
            </span>
            {author.bio && (
              <span className="mt-1 line-clamp-2 block text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {author.bio}
              </span>
            )}
          </span>
        </a>
        <span className="shrink-0">
          <FollowButton username={author.username} initialFollowerCount={0} sourcePostId={postId} />
        </span>
      </div>
    </section>
  );
}
