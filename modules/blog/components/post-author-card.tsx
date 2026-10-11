import { cn } from "@/lib/utils";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { AuthorName } from "@/modules/blog/components/author-name";
import { Avatar } from "@/modules/blog/components/avatar";
import { END_SECTION } from "@/modules/blog/components/end-section";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { authorHref } from "@/modules/blog/lib/author-href";
import { contentLang } from "@/modules/blog/lib/content-lang";

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
  return (
    <section data-testid="post-author-card" className={cn(END_SECTION, className)}>
      <div className="flex items-start gap-4">
        <a
          href={authorHref(author.username, locale)}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded focus-ring"
          data-bhv="profile"
          data-bhv-id={author.username}
        >
          <Avatar src={author.avatarUrl} name={author.displayName || author.username} seed={author.id} size="lg" />
          <span className="min-w-0">
            <AuthorName
              name={author.displayName}
              handle={author.username}
              className="gap-1.5 text-[15px] font-semibold text-slate-900 group-hover:text-accent-700 dark:text-slate-100 dark:group-hover:text-accent-400"
              handleClassName="text-[13px] text-slate-500 dark:text-slate-400"
            />
            {author.bio && (
              <span
                lang={contentLang(author.bio)}
                className="mt-1 line-clamp-2 block text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400"
              >
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
