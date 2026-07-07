"use client";

import { DATE_LOCALE } from "@/lib/date";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { ReportButton } from "@/modules/blog/components/report-button";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { useConfirm } from "@/components/ui/use-confirm";

// 대부분의 방문자는 댓글을 쓰지 않는다. 에디터(Tiptap/ProseMirror, ~120KB+)는 실제로 입력칸을
// 건드릴 때만 로드한다 — ssr:false 로 서버 번들에서 빼고, 답글 컴포저는 열 때 마운트되며(아래),
// 항상 보이는 상단 컴포저는 첫 포커스 전까지 같은 한 줄 자리 표시자로 대신한다.
const CommentComposer = dynamic(
  () => import("@/modules/blog/components/comment-composer").then((m) => m.CommentComposer),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[76px] rounded-xl border border-slate-200 dark:border-slate-700"
        aria-hidden
      />
    ),
  },
);


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
  // 쓰기 경로(작성·답글·삭제) 실패를 알리는 인라인 문구 — 실패가 조용히 새면 사용자는 등록된 줄 안다.
  const [error, setError] = useState<string | null>(null);
  // The just-posted comment's id — drives its slide-in entrance animation once it renders.
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  // 보는 사람이 좋아요한 댓글 id — 공개 목록은 비인증이라 인증 후 별도 엔드포인트로 한 번 hydrate.
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  // 상단 컴포저를 켜기 전엔 에디터 청크를 받지 않는다 — 포커스/클릭 시에만 실제 컴포저를 마운트.
  const [topComposerActive, setTopComposerActive] = useState(false);
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
    setError(null);
    try {
      const created = await createComment(postId, body.trim());
      setBody("");
      // 서버가 돌려준 완성 댓글을 낙관 추가 — 전체 재조회(load)는 실패 시 목록을 [] 로 덮으므로 피한다.
      setComments((prev) => [...prev, created]);
      setJustAddedId(created.id); // animate the new comment in once it renders
    } catch {
      setError(t("submitError"));
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
    setError(null);
    try {
      const created = await createComment(postId, replyBody.trim(), parentId);
      setReplyBody("");
      setReplyTo(null);
      setComments((prev) => [...prev, created]);
      setJustAddedId(created.id);
    } catch {
      setError(t("submitError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!(await confirm({ title: t("deleteConfirm"), destructive: true }))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteComment(id);
      // 삭제한 댓글(+그 답글)만 걷어낸다 — 재조회 대신 로컬 반영으로 목록 증발을 막는다.
      setComments((prev) => prev.filter((x) => x.id !== id && x.parentId !== id));
    } catch {
      setError(t("deleteError"));
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
        {topComposerActive ? (
          <CommentComposer
            value={body}
            onChange={setBody}
            onSubmit={() => void submitTop()}
            placeholder={t("placeholder")}
            submitLabel={busy ? t("submitting") : t("submit")}
            cancelLabel={t("cancel")}
            submitting={busy}
            canSubmit={!authenticated || !!body.trim()}
            footer={ready && !authenticated ? t("loginPrompt") : ""}
            rows={2}
            collapsible
            autoFocus
          />
        ) : (
          // 쉬는 상태의 한 줄 컴포저와 같은 모양의 정적 자리 표시자 — 여기서 포커스가 들어오면
          // 실제 컴포저(+에디터 청크)를 마운트한다.
          <button
            type="button"
            onClick={() => setTopComposerActive(true)}
            onFocus={() => setTopComposerActive(true)}
            className="focus-ring block w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-[15px] text-slate-400 transition-colors hover:border-slate-300 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600"
          >
            {t("placeholder")}
          </button>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
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
                    cancelLabel={t("cancel")}
                    submitting={busy}
                    canSubmit={!!replyBody.trim()}
                    rows={2}
                    autoFocus
                    compact
                    collapsible
                    onCancel={() => setReplyTo(null)}
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
        {/* Avatar + @handle link to the commenter's profile (soft nav when same-origin, hard on the
            author subdomain). */}
        <BlogLink
          href={profileHref ?? "#"}
          className={`group/author flex min-w-0 items-center gap-2 rounded focus-ring ${hasAuthor ? "" : "pointer-events-none"}`}
          aria-disabled={!hasAuthor}
        >
          <Avatar src={comment.author?.avatarUrl} name={username} size="sm" shrink={false} />
          <span className="truncate text-sm font-medium text-slate-900 transition-colors group-hover/author:text-accent-700 dark:text-slate-100 dark:group-hover/author:text-accent-400">
            @{username}
          </span>
        </BlogLink>
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
