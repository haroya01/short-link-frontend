"use client";

import { DATE_LOCALE } from "@/lib/date";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CornerDownRight, Trash2, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createComment,
  likeComment,
  listLikedCommentIds,
  unlikeComment,
  deleteComment,
  listComments,
  type CommentView,
} from "@/modules/blog/api/comments";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { CommentBody } from "@/modules/blog/components/comment-markdown";
import { CommentComposer } from "@/modules/blog/components/comment-composer";
import { ReportButton } from "@/modules/blog/components/report-button";
import { useConfirm } from "@/components/ui/use-confirm";


export function PostComments({
  postId,
  authorUsername,
}: {
  postId: number;
  authorUsername: string;
}) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const { authenticated, ready, me, signInWithGoogle } = useAuth();

  const [comments, setComments] = useState<CommentView[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  // The just-posted comment's id — drives its slide-in entrance animation once it renders.
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  // 보는 사람이 좋아요한 댓글 id — 공개 목록은 비인증이라 인증 후 별도 엔드포인트로 한 번 hydrate.
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [confirm, confirmDialog] = useConfirm();

  const load = useCallback(() => {
    return listComments(postId)
      .then(setComments)
      .catch(() => setComments([]));
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    listLikedCommentIds(postId)
      .then((ids) => setLikedIds(new Set(ids)))
      .catch(() => {});
  }, [ready, authenticated, postId]);

  // 낙관 토글: UI 를 먼저 뒤집고 서버의 authoritative count 로 정착, 실패 시 원복.
  async function toggleLike(c: CommentView) {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    const wasLiked = likedIds.has(c.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
    setComments((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, likeCount: Math.max(0, x.likeCount + (wasLiked ? -1 : 1)) } : x)),
    );
    try {
      const status = wasLiked ? await unlikeComment(c.id) : await likeComment(c.id);
      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, likeCount: status.likeCount } : x)));
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(c.id);
        else next.delete(c.id);
        return next;
      });
      setComments((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, likeCount: Math.max(0, x.likeCount + (wasLiked ? 1 : -1)) } : x)),
      );
    }
  }

  const tops = comments.filter((c) => c.parentId == null);
  const repliesOf = (id: number) => comments.filter((c) => c.parentId === id);
  const canDelete = (c: CommentView) =>
    !!me && (c.author?.id === me.id || me.username === authorUsername);

  async function submitTop() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const created = await createComment(postId, body.trim());
      setBody("");
      await load();
      setJustAddedId(created.id); // animate the new comment in once it renders
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(parentId: number) {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (!replyBody.trim() || busy) return;
    setBusy(true);
    try {
      const created = await createComment(postId, replyBody.trim(), parentId);
      setReplyBody("");
      setReplyTo(null);
      await load();
      setJustAddedId(created.id);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!(await confirm({ title: t("deleteConfirm"), destructive: true }))) return;
    setBusy(true);
    try {
      await deleteComment(id);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    timeZone: "Asia/Seoul",
  });
  }

  return (
    <section className="mt-16 border-t border-slate-100 pt-10 dark:border-slate-800">
      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t("count", { count: comments.length })}
      </h2>

      {/* The input is ALWAYS visible so there's always a way to comment. Signed-out (or pre-auth)
          submit kicks off login instead of hiding the field. */}
      <div className="mt-4">
        <CommentComposer
          value={body}
          onChange={setBody}
          onSubmit={() => void submitTop()}
          placeholder={t("placeholder")}
          submitLabel={busy ? t("submitting") : t("submit")}
          submitting={busy}
          canSubmit={!authenticated || !!body.trim()}
          footer={ready && !authenticated ? t("loginPrompt") : ""}
        />
      </div>

      {comments.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {tops.map((c) => (
            <li key={c.id}>
              <CommentRow
                comment={c}
                fmt={fmt}
                canDelete={canDelete(c)}
                canReport={!canDelete(c)}
                onDelete={() => remove(c.id)}
                deleteLabel={t("delete")}
                liked={likedIds.has(c.id)}
                likeLabel={t("like")}
                onToggleLike={() => void toggleLike(c)}
                isNew={c.id === justAddedId}
              >
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyBody("");
                  }}
                  className="touch-target inline-flex items-center gap-1 rounded text-[13px] text-slate-500 transition-colors hover:text-accent-700 focus-ring"
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                  {t("reply")}
                </button>
              </CommentRow>

              {repliesOf(c.id).length > 0 && (
                <ul className="mt-4 space-y-4 border-l-2 border-slate-100 pl-5 dark:border-slate-800">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentRow
                        comment={r}
                        fmt={fmt}
                        canDelete={canDelete(r)}
                        canReport={!canDelete(r)}
                        onDelete={() => remove(r.id)}
                        deleteLabel={t("delete")}
                        liked={likedIds.has(r.id)}
                        likeLabel={t("like")}
                        onToggleLike={() => void toggleLike(r)}
                        isNew={r.id === justAddedId}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {replyTo === c.id && (
                <div className="mt-3 border-l-2 border-slate-100 pl-5 dark:border-slate-800">
                  <CommentComposer
                    value={replyBody}
                    onChange={setReplyBody}
                    onSubmit={() => void submitReply(c.id)}
                    placeholder={t("replyPlaceholder")}
                    submitLabel={t("reply")}
                    submitting={busy}
                    canSubmit={!!replyBody.trim()}
                    rows={2}
                    autoFocus
                    compact
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}
    </section>
  );
}

function CommentRow({
  comment,
  fmt,
  canDelete,
  canReport,
  onDelete,
  deleteLabel,
  liked,
  likeLabel,
  onToggleLike,
  isNew,
  children,
}: {
  comment: CommentView;
  fmt: (iso: string) => string;
  canDelete: boolean;
  canReport: boolean;
  onDelete: () => void;
  deleteLabel: string;
  liked: boolean;
  likeLabel: string;
  onToggleLike: () => void;
  isNew?: boolean;
  children?: React.ReactNode;
}) {
  const locale = useLocale();
  const username = comment.author?.username ?? "?";
  const hasAuthor = !!comment.author?.username;
  const profileHref = hasAuthor ? authorHref(username, locale) : undefined;
  return (
    <div className={isNew ? "comment-in" : undefined}>
      <div className="flex items-center gap-2">
        {/* Avatar + @handle link to the commenter's profile (cross-host on prod). */}
        <a
          href={profileHref ?? "#"}
          className={`group/author flex min-w-0 items-center gap-2 rounded focus-ring ${hasAuthor ? "" : "pointer-events-none"}`}
          aria-disabled={!hasAuthor}
        >
          <Avatar src={comment.author?.avatarUrl} name={username} size="sm" shrink={false} />
          <span className="truncate text-sm font-medium text-slate-900 transition-colors group-hover/author:text-accent-700 dark:text-slate-100 dark:group-hover/author:text-accent-400">
            @{username}
          </span>
        </a>
        <span className="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">{fmt(comment.createdAt)}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* 신고는 내가 지울 수 없는 (= 내 글/내 댓글이 아닌) 댓글에만 노출 — 내 것엔 휴지통만. */}
          {canReport && <ReportButton subjectType="COMMENT" subjectId={comment.id} />}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="touch-target rounded text-slate-300 transition-colors hover:text-red-500 focus-ring"
              aria-label={deleteLabel}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1.5 pl-9 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        <CommentBody text={comment.body} locale={locale} />
      </div>
      <div className="mt-1.5 flex items-center gap-3 pl-9">
        {/* 댓글 공감 — 포스트 LikeButton 과 같은 문법(하트 fill + pop), 카운트는 >0 일 때만. */}
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={likeLabel}
          className={`touch-target inline-flex items-center gap-1 rounded text-[13px] transition-colors focus-ring ${
            liked
              ? "text-accent-700 dark:text-accent-400"
              : "text-slate-500 hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
          }`}
        >
          <span key={liked ? "on" : "off"} className="subscribe-pop inline-flex">
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-accent-600 text-accent-600" : ""}`} />
          </span>
          <span aria-live="polite">{comment.likeCount > 0 ? comment.likeCount : ""}</span>
        </button>
        {children}
      </div>
    </div>
  );
}
