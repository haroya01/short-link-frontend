import { BookmarkButton } from "@/modules/blog/components/bookmark-button";
import { ConnectButton } from "@/modules/blog/components/connect-button";
import { LikeButton } from "@/modules/blog/components/like-button";
import { ShareButton } from "@/modules/blog/components/share-button";
import { PostReaderMenu } from "./post-reader-menu";

/**
 * ♡ · 저장 · 엮기 · 공유 · ⋯ as one row of the same icon button. Below 1100px the dock carries the reader
 * actions, so the header (`menuOnlyBelowWide`) keeps just the ⋯ there.
 */
export function PostActionRow({
  postId,
  postTitle,
  postSlug,
  postUrl,
  likeCount,
  authorUsername,
  locale,
  menuOnlyBelowWide = false,
}: {
  postId: number;
  postTitle: string;
  postSlug: string;
  postUrl: string;
  likeCount: number;
  authorUsername: string;
  locale: string;
  menuOnlyBelowWide?: boolean;
}) {
  return (
    <div data-post-action-row className="flex items-center gap-1">
      <div className={menuOnlyBelowWide ? "hidden min-[1100px]:contents" : "contents"}>
        <LikeButton postId={postId} initialCount={likeCount} postTitle={postTitle} />
        <BookmarkButton postId={postId} />
        <ConnectButton postId={postId} postTitle={postTitle} />
        <ShareButton postUrl={postUrl} postSlug={postSlug} postTitle={postTitle} />
      </div>
      <PostReaderMenu
        postId={postId}
        authorUsername={authorUsername}
        postTitle={postTitle}
        postSlug={postSlug}
        postUrl={postUrl}
        locale={locale}
      />
    </div>
  );
}
