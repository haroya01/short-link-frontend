"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CornerDownRight, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createComment,
  deleteComment,
  listComments,
  type CommentView,
} from "@/modules/blog/api/comments";

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

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

  const load = useCallback(() => {
    return listComments(postId)
      .then(setComments)
      .catch(() => setComments([]));
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

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
      await createComment(postId, body.trim());
      setBody("");
      await load();
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
      await createComment(postId, replyBody.trim(), parentId);
      setReplyBody("");
      setReplyTo(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
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
          <span className="text-[12px] text-slate-400">
            {ready && !authenticated ? t("loginPrompt") : ""}
          </span>
          <button
            type="submit"
            disabled={busy || (authenticated && !body.trim())}
            className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 focus-ring disabled:opacity-50"
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
              <CommentRow comment={c} fmt={fmt} canDelete={canDelete(c)} onDelete={() => remove(c.id)} deleteLabel={t("delete")}>
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
                        onDelete={() => remove(r.id)}
                        deleteLabel={t("delete")}
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
                      className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 focus-ring disabled:opacity-50"
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
    </section>
  );
}

function CommentRow({
  comment,
  fmt,
  canDelete,
  onDelete,
  deleteLabel,
  children,
}: {
  comment: CommentView;
  fmt: (iso: string) => string;
  canDelete: boolean;
  onDelete: () => void;
  deleteLabel: string;
  children?: React.ReactNode;
}) {
  const username = comment.author?.username ?? "?";
  return (
    <div>
      <div className="flex items-center gap-2">
        {comment.author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.author.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700">
            {username.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">@{username}</span>
        <span className="text-[12px] text-slate-500 dark:text-slate-400">{fmt(comment.createdAt)}</span>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="touch-target ml-auto rounded text-slate-300 transition-colors hover:text-red-500 focus-ring"
            aria-label={deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-line pl-9 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {comment.body}
      </p>
      {children && <div className="mt-1.5 pl-9">{children}</div>}
    </div>
  );
}
