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
    <section className="mt-16 border-t border-slate-100 pt-10">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">
        {t("count", { count: comments.length })}
      </h2>

      {ready && authenticated ? (
        <form onSubmit={submitTop} className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={t("placeholder")}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors focus:border-accent-400"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {busy ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      ) : ready ? (
        <button
          type="button"
          onClick={signInWithGoogle}
          className="mt-4 w-full rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500 transition-colors hover:border-accent-300 hover:text-accent-700"
        >
          {t("loginPrompt")}
        </button>
      ) : null}

      {comments.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">{t("empty")}</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {tops.map((c) => (
            <li key={c.id}>
              <CommentRow comment={c} fmt={fmt} canDelete={canDelete(c)} onDelete={() => remove(c.id)}>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyBody("");
                  }}
                  className="inline-flex items-center gap-1 text-[13px] text-slate-400 transition-colors hover:text-accent-700"
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                  {t("reply")}
                </button>
              </CommentRow>

              {repliesOf(c.id).length > 0 && (
                <ul className="mt-4 space-y-4 border-l-2 border-slate-100 pl-5">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentRow
                        comment={r}
                        fmt={fmt}
                        canDelete={canDelete(r)}
                        onDelete={() => remove(r.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {replyTo === c.id && ready && authenticated && (
                <div className="mt-3 border-l-2 border-slate-100 pl-5">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder={t("replyPlaceholder")}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-400"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => submitReply(c.id)}
                      disabled={busy || !replyBody.trim()}
                      className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
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
  children,
}: {
  comment: CommentView;
  fmt: (iso: string) => string;
  canDelete: boolean;
  onDelete: () => void;
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
        <span className="text-sm font-medium text-slate-900">@{username}</span>
        <span className="text-[12px] text-slate-400">{fmt(comment.createdAt)}</span>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-slate-300 transition-colors hover:text-red-500"
            aria-label="delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-line pl-9 text-[15px] leading-relaxed text-slate-700">
        {comment.body}
      </p>
      {children && <div className="mt-1.5 pl-9">{children}</div>}
    </div>
  );
}
