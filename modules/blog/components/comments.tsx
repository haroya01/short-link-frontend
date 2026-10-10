"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { CornerDownRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { askToSignIn } from "@/components/auth/login-prompt";
import { clearDraft, readDraft, writeDraft } from "@/modules/blog/lib/conversation-draft";
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
import { CommentBody } from "@/modules/blog/components/comment-markdown";
import { CommentMenu } from "@/modules/blog/components/comment-menu";
import { ConversationLike, ConversationRow } from "@/modules/blog/components/conversation-row";
import { useConfirm } from "@/components/ui/use-confirm";
import { isShareable, listPostQuotes, type Note, type PostQuotes } from "@/modules/notes/api/notes";
import { onPostQuoted } from "@/modules/blog/lib/consequence-events";
import { useBlockedNames } from "@/modules/blog/lib/user-blocks";
import { NoteList } from "@/modules/notes/components/note-list";
import { compactTime } from "@/modules/notes/lib/compact-time";
import { QuoteInNoteButton } from "@/modules/notes/components/quote-in-note-button";
import { useApiErrorMessage } from "@/lib/error-messages";

// The composer pulls in the Tiptap/ProseMirror editor (rich-comment-input) — a heavy graph that most
// readers never touch. Splitting it into its own chunk keeps the editor out of the post page's initial
// JS; it loads on the first click of the placeholder field (top-level) or the Reply button. A resting
// one-line placeholder matching the collapsed field holds its place until then.
const CommentComposer = dynamic(
  () => import("@/modules/blog/components/comment-composer").then((m) => m.CommentComposer),
  { ssr: false, loading: () => <ComposerSkeleton /> },
);

/** Matches the collapsed rest-state height of the real composer so the mount doesn't shift layout. */
function ComposerSkeleton() {
  return <div className="h-12 rounded-surface border border-slate-200 dark:border-slate-700" />;
}

/** Append a just-created comment, dropping any existing row with the same id — guards a double-submit
 *  (or a refetch that already merged it) from showing the same comment twice. */
function appendUnique(prev: CommentView[], created: CommentView): CommentView[] {
  return [...prev.filter((c) => c.id !== created.id), created];
}

export function PostComments({
  postId,
  authorUsername,
  title,
  slug,
}: {
  postId: number;
  authorUsername: string;
  title: string;
  slug: string;
}) {
  const t = useTranslations("comments");
  const tCommon = useTranslations("common");
  const errorMessage = useApiErrorMessage();
  const locale = useLocale();
  const { authenticated, ready, me } = useAuth();

  const [comments, setComments] = useState<CommentView[]>([]);
  const blocked = useBlockedNames();
  const [quotes, setQuotes] = useState<PostQuotes | null>(null);
  const [quotedNow, setQuotedNow] = useState<Note[]>([]);
  const loadQuotes = useCallback((page: number) => listPostQuotes(postId, page), [postId]);
  const [tab, setTab] = useState<"comments" | "notes">("comments");

  useEffect(() => {
    let alive = true;
    listPostQuotes(postId)
      .then((found) => alive && setQuotes(found))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [postId]);

  useEffect(
    () =>
      onPostQuoted((quotedPostId, note) => {
        if (quotedPostId !== postId || !isShareable(note.visibility)) return;
        setQuotedNow((current) => (current.some((n) => n.id === note.id) ? current : [note, ...current]));
        setQuotes((current) =>
          current ? { ...current, total: current.total + 1 } : { items: [], page: 0, hasNext: false, total: 1 },
        );
      }),
    [postId],
  );
  const [body, setBody] = useState("");
  // The top composer mounts (and its Tiptap chunk loads) only after the reader taps the placeholder.
  const [composerActive, setComposerActive] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const draftsRestored = useRef(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  // 쓰기 경로(작성·답글·삭제) 실패를 알리는 인라인 문구 — 실패가 조용히 새면 사용자는 등록된 줄 안다.
  const [error, setError] = useState<string | null>(null);
  // The just-posted comment's id — drives its slide-in entrance animation once it renders.
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  // 보는 사람이 좋아요한 댓글 id — 공개 목록은 비인증이라 인증 후 별도 엔드포인트로 한 번 hydrate.
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  // 목록 로드 실패 — "댓글 없음"으로 위장하지 않고 재시도를 내민다(빈 상태 ≠ 에러).
  const [loadFailed, setLoadFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);
  const focusedRef = useRef(false);
  const [confirm, confirmDialog] = useConfirm();

  const loadSeq = useRef(0);
  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    setLoadFailed(false);
    return listComments(postId)
      .then((list) => {
        if (seq !== loadSeq.current) return;
        setComments(list);
        setLoadFailed(false);
      })
      .catch(() => {
        if (seq === loadSeq.current) setLoadFailed(true);
      })
      .finally(() => setLoaded(true));
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ready || !authenticated || !loaded || draftsRestored.current) return;
    draftsRestored.current = true;
    const top = readDraft("comment", postId);
    if (top?.text.trim()) {
      setBody(top.text);
      setRestoredDraft(true);
      setComposerActive(true);
    }
    const reply = readDraft("comment-reply", postId);
    if (reply?.target != null && comments.some((c) => c.id === reply.target && c.parentId == null)) {
      setReplyTo(reply.target);
      setReplyBody(reply.text);
    }
  }, [ready, authenticated, loaded, postId, comments]);

  useEffect(() => {
    if (!draftsRestored.current) return;
    if (body.trim()) writeDraft("comment", postId, body);
    else clearDraft("comment", postId);
  }, [body, postId]);

  useEffect(() => {
    if (!draftsRestored.current) return;
    if (replyTo != null && replyBody.trim()) writeDraft("comment-reply", postId, replyBody, replyTo);
    else clearDraft("comment-reply", postId);
  }, [replyTo, replyBody, postId]);

  // Rows render after the fetch, so the browser's own `#comment-<id>` jump has nothing to land on. Rails
  // above the comments can still load after the jump and push the row out of view — re-aim twice unless
  // the reader has started moving on their own.
  useEffect(() => {
    if (!loaded || focusedRef.current) return;
    const match = /^#comment-(\d+)$/.exec(window.location.hash);
    if (!match) return;
    const id = Number(match[1]);
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const aim = () => {
      const target = document.getElementById(`comment-${id}`);
      (target ?? document.getElementById("comments"))?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: target ? "center" : "start",
      });
      return target != null;
    };
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const timers: number[] = [];
    const release = () => {
      focusedRef.current = true;
      timers.forEach((t) => window.clearTimeout(t));
      inputs.forEach((e) => window.removeEventListener(e, release));
    };
    inputs.forEach((e) => window.addEventListener(e, release, { passive: true }));
    if (aim()) setFlashId(id);
    timers.push(window.setTimeout(aim, 500));
    timers.push(
      window.setTimeout(() => {
        aim();
        release();
      }, 1300),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      inputs.forEach((e) => window.removeEventListener(e, release));
    };
  }, [loaded]);

  useEffect(() => {
    if (flashId == null) return;
    const timer = window.setTimeout(() => setFlashId(null), 1600);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    listLikedCommentIds(postId)
      .then((ids) => setLikedIds(new Set(ids)))
      .catch(() => {});
  }, [ready, authenticated, postId]);

  // 낙관 토글: UI 를 먼저 뒤집고 서버의 authoritative count 로 정착, 실패 시 원복.
  async function toggleLike(c: CommentView) {
    if (!authenticated) {
      askToSignIn("like");
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

  const shown = comments.filter((c) => !c.author || !blocked.has(c.author.username));
  const tops = shown.filter((c) => c.parentId == null);
  const repliesOf = (id: number) => shown.filter((c) => c.parentId === id);
  const canDelete = (c: CommentView) =>
    !!me && (c.author?.id === me.id || me.username === authorUsername);

  async function submitTop() {
    if (!authenticated) {
      askToSignIn("comment");
      return;
    }
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createComment(postId, body.trim());
      setBody("");
      setComments((prev) => appendUnique(prev, created));
      setJustAddedId(created.id); // animate the new comment in once it renders
    } catch (e) {
      setError(errorMessage(e, t("submitError")));
    } finally {
      setBusy(false);
    }
  }

  function askToReply(parentId: number, prefill = "") {
    writeDraft("comment-reply", postId, prefill, parentId);
    const back = new URL(window.location.href);
    back.hash = `comment-${parentId}`;
    askToSignIn("reply", back.toString());
  }

  async function submitReply(parentId: number) {
    if (!authenticated) {
      askToSignIn("reply");
      return;
    }
    if (!replyBody.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createComment(postId, replyBody.trim(), parentId);
      setReplyBody("");
      setReplyTo(null);
      setComments((prev) => appendUnique(prev, created));
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
    return compactTime(iso, locale);
  }

  return (
    <section
      id="comments"
      className="mt-16 scroll-mt-24 border-t border-slate-100 pt-10 dark:border-slate-800"
    >
      {/* 0일 때 카운트를 그리지 않는다 — "댓글 0개" 헤딩 + 빈 컴포저 + "첫 댓글" 문구로 공허를
          세 번 반복하던 표면(적대 검증 r4). 숫자는 있을 때만 정보다. */}
      {quotes && quotes.total > 0 ? (
        <>
          <h2 className="sr-only">{shown.length > 0 ? t("count", { count: shown.length }) : t("heading")}</h2>
          <div role="tablist" aria-label={t("discussionTabs")} className="flex items-baseline gap-5">
            {(
              [
                ["comments", shown.length > 0 ? t("count", { count: shown.length }) : t("heading")],
                ["notes", t("notesTab", { count: quotes.total })],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                data-testid={`discussion-tab-${key}`}
                onClick={() => setTab(key)}
                className={`focus-ring rounded text-lg font-bold tracking-tight transition-colors ${
                  tab === key
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {shown.length > 0 ? t("count", { count: shown.length }) : t("heading")}
        </h2>
      )}

      {tab === "notes" && quotes ? (
        <div className="mt-4" role="tabpanel" data-testid="post-quote-notes">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("notesTabHint")}</p>
            <QuoteInNoteButton postId={postId} title={title} slug={slug} authorUsername={authorUsername} />
          </div>
          <NoteList
            load={loadQuotes}
            initial={quotes}
            prepend={quotedNow}
            filterContext="public"
            empty={null}
          />
        </div>
      ) : (
      <>

      {/* There's ALWAYS a way to comment: a resting one-line placeholder that, on tap, mounts the real
          composer (and lazy-loads its Tiptap chunk) already focused. Signed-out, the tap asks to sign in
          instead. Once mounted the composer stays (collapsing to a quiet one-line at rest via
          `collapsible`) so the deferral is a one-time first-tap cost only. */}
      <div className="mt-4">
        {composerActive ? (
          <CommentComposer
            value={body}
            onChange={setBody}
            onSubmit={() => void submitTop()}
            placeholder={t("placeholder")}
            submitLabel={busy ? t("submitting") : t("submit")}
            cancelLabel={t("cancel")}
            submitting={busy}
            canSubmit={!authenticated || !!body.trim()}
            rows={2}
            collapsible
            autoFocus={!restoredDraft}
          />
        ) : (
          <button
            type="button"
            data-testid="comment-composer-placeholder"
            onClick={() => (ready && !authenticated ? askToSignIn("comment") : setComposerActive(true))}
            className="flex w-full items-center gap-3 rounded-full border border-slate-200 px-3 py-2.5 text-left text-[15px] text-slate-500 transition-colors hover:border-accent-400 focus-ring dark:border-slate-700 dark:text-slate-400"
          >
            {ready && authenticated && me && (
              <Avatar src={me.avatarUrl ?? null} name={me.username ?? "?"} size="sm" shrink={false} />
            )}
            <span className="min-w-0 truncate">{t("placeholder")}</span>
          </button>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {loadFailed && (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400" role="alert" data-testid="comments-load-failed">
          {t("loadFailed")}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="focus-ring rounded underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {tCommon("retry")}
          </button>
        </p>
      )}
      {shown.length > 0 && (
        <ul className="mt-8 space-y-6">
          {tops.map((c) => (
            <li key={c.id}>
              <CommentRow
                anchorId={`comment-${c.id}`}
                flash={flashId === c.id}
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
                    if (ready && !authenticated) return askToReply(c.id);
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyBody("");
                  }}
                  className="touch-target inline-flex items-center gap-1 rounded text-[13px] text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                  {t("reply")}
                </button>
              </CommentRow>

              {repliesOf(c.id).length > 0 && (
                <ul className="mt-4 space-y-4 pl-12">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentRow
                        anchorId={`comment-${r.id}`}
                        flash={flashId === r.id}
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
                      >
                        <button
                          type="button"
                          data-testid={`comment-reply-${r.id}`}
                          onClick={() => {
                            const handle = r.author?.username;
                            const prefill = handle && handle !== me?.username ? `@${handle} ` : "";
                            if (ready && !authenticated) return askToReply(c.id, prefill);
                            setReplyTo(c.id);
                            setReplyBody(prefill);
                          }}
                          className="touch-target inline-flex items-center gap-1 rounded text-[13px] text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
                        >
                          <CornerDownRight className="h-3.5 w-3.5" />
                          {t("reply")}
                        </button>
                      </CommentRow>
                    </li>
                  ))}
                </ul>
              )}

              {replyTo === c.id && (
                <div className="mt-3 pl-12">
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
      </>
      )}
      {confirmDialog}
    </section>
  );
}

function CommentRow({
  anchorId,
  flash,
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
  anchorId: string;
  flash: boolean;
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
  return (
    <ConversationRow
      id={anchorId}
      author={comment.author}
      createdAt={comment.createdAt}
      time={fmt(comment.createdAt)}
      nested={comment.parentId != null}
      flash={flash}
      isNew={isNew}
      menu={<CommentMenu commentId={comment.id} authorUsername={comment.author?.username ?? null} canReport={canReport} />}
      onDelete={canDelete ? onDelete : undefined}
      deleteLabel={deleteLabel}
      actions={
        <>
          <ConversationLike liked={liked} count={comment.likeCount} label={likeLabel} onToggle={onToggleLike} />
          {children}
        </>
      }
    >
      <CommentBody text={comment.body} locale={locale} mentions={comment.mentions} />
    </ConversationRow>
  );
}
