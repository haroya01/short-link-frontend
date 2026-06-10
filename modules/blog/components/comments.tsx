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

  async function submitTop(e: React.FormEvent) {
    e.preventDefault();
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
    });
  }

  return (
    <section className="mt-16 border-t border-slate-100 pt-10 dark:border-slate-800">
      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {t("count", { count: comments.length })}
      </h2>

      {/* The input is ALWAYS visible so there's always a way to comment. Signed-out (or pre-auth)
          submit kicks off login instead of hiding the field. */}
      <form onSubmit={submitTop} className="mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          aria-label={t("placeholder")}
          placeholder={t("placeholder")}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            {ready && !authenticated ? t("loginPrompt") : ""}
          </span>
          <button
            type="submit"
            disabled={busy || (authenticated && !body.trim())}
            className="rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800 focus-ring disabled:opacity-50"
          >
            {busy ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>

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
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    aria-label={t("replyPlaceholder")}
                    placeholder={t("replyPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => submitReply(c.id)}
                      disabled={busy || !replyBody.trim()}
                      className="rounded-lg bg-accent-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-800 focus-ring disabled:opacity-50"
                    >
                      {t("reply")}
                    </button>
                  </div>
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

// Matches @username (the backend's handle grammar); the lookbehind keeps it out of emails (foo@bar).
const MENTION_RE = /(?<![A-Za-z0-9_])@([a-z0-9][a-z0-9_]{2,15})/g;

/** @멘션만 링크로 — 인라인 마크다운 파서가 plain 세그먼트에 대해 호출한다. */
function linkifyMentions(text: string, locale: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const handle = m[1];
    nodes.push(
      <a
        key={`${keyBase}-${m.index}`}
        href={authorHref(handle, locale)}
        className="font-medium text-accent-700 transition-colors hover:underline dark:text-accent-400"
      >
        @{handle}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// 인라인 마크다운: `code` → [라벨](http URL) → **굵게** → *기울임* 순서로 한 토큰씩 소비하고,
// 남는 plain 텍스트는 멘션 링크화. React 노드를 직접 조립하므로(raw HTML 없음) XSS 표면이 없다.
const INLINE_RE = /(`[^`\n]+`)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/;

function renderInline(text: string, locale: string, keyBase = "i"): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest.length > 0) {
    const m = rest.match(INLINE_RE);
    if (!m || m.index == null) {
      out.push(...linkifyMentions(rest, locale, `${keyBase}-${k}`));
      break;
    }
    if (m.index > 0) out.push(...linkifyMentions(rest.slice(0, m.index), locale, `${keyBase}-${k}`));
    const tok = m[0];
    const key = `${keyBase}-${k++}`;
    if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12.5px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[")) {
      const lm = tok.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (lm) {
        out.push(
          <a key={key} href={lm[2]} target="_blank" rel="noreferrer noopener" className="text-accent-700 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-600 dark:text-accent-400">
            {lm[1]}
          </a>,
        );
      } else {
        out.push(tok);
      }
    } else if (tok.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold">
          {renderInline(tok.slice(2, -2), locale, key)}
        </strong>,
      );
    } else {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), locale, key)}</em>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

/** 댓글 본문 — 마크다운 서브셋(코드블록·인용·리스트·인라인 서식) + @멘션 링크.
 *  본문(.prose-post)과 같은 문법이되 댓글 크기로: 개발 블로그 독자에겐 댓글 코드블록이 필수다.
 *  헤딩 문법은 의도적으로 무시(댓글이 글의 위계와 경쟁하지 않게 — plain 문단으로 떨어진다). */
function CommentBody({ text, locale }: { text: string; locale: string }) {
  const out: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++; // 닫는 펜스
      out.push(
        <pre key={k++} className="my-1.5 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-slate-100">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) quote.push(lines[i++].slice(2));
      out.push(
        <blockquote key={k++} className="my-1.5 border-l-2 border-accent-200 pl-3 text-slate-500 dark:border-accent-500/40 dark:text-slate-400">
          {renderInline(quote.join(" "), locale, `q${k}`)}
        </blockquote>,
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) items.push(lines[i++].slice(2));
      out.push(
        <ul key={k++} className="my-1.5 list-disc space-y-0.5 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, locale, `l${k}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // 일반 문단 — 연속 줄을 한 문단으로(단일 개행은 공백)
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(```|> |[-*] )/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={k++}>{renderInline(para.join(" "), locale, `p${k}`)}</p>);
  }
  return <div className="space-y-1.5">{out}</div>;
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
