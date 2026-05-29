"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  deletePost,
  getBlocks,
  getPost,
  publishPost,
  replaceBlocks,
  republishPost,
  unpublishPost,
  updatePostMetadata,
  type PostStatus,
  type PostView,
} from "@/modules/blog/api/posts";
import { assignPostToSeries } from "@/modules/blog/api/series";
import { uploadPostImage } from "@/modules/blog/api/post-images";
import { blocksToMarkdown, markdownToBlocks } from "@/modules/blog/lib/markdown-to-blocks";
import { MarkdownEditor } from "@/modules/blog/components/editor/markdown-editor";
import { TagInput } from "@/modules/blog/components/editor/tag-input";
import { SeriesSelect } from "@/modules/blog/components/editor/series-select";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const t = useTranslations("postEditor");
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const postId = Number(params.id);

  const [post, setPost] = useState<PostView | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // The blog list path with the current prefix preserved (locale + /blog-preview on the apex, or
  // the bare path on blog.kurl.me) — a root-relative "/write" would 404 on the apex.
  const [writeBase, setWriteBase] = useState("/write");

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

  const load = useCallback(async () => {
    if (!Number.isFinite(postId)) return;
    setLoading(true);
    setError(null);
    try {
      const [p, blocks] = await Promise.all([getPost(postId), getBlocks(postId)]);
      setPost(p);
      setTitle(p.title);
      setSlug(p.slug);
      setMarkdown(blocksToMarkdown(blocks));
      setTags(p.tags ?? []);
      setSeriesId(p.seriesId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void load();
  }, [ready, authenticated, load]);

  async function handleSave() {
    if (post == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Slug is editable only while DRAFT (frozen once the post has been public).
      const updated = await updatePostMetadata(post.id, {
        title: title.trim(),
        tags,
        ...(post.status === "DRAFT" ? { slug: slug.trim() } : {}),
      });
      await replaceBlocks(post.id, markdownToBlocks(markdown));
      await assignPostToSeries(post.id, seriesId, post.seriesId ?? null);
      setPost({ ...updated, seriesId });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(action: "publish" | "unpublish" | "republish") {
    if (post == null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated =
        action === "publish"
          ? await publishPost(post.id)
          : action === "unpublish"
            ? await unpublishPost(post.id)
            : await republishPost(post.id);
      setPost(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (post == null) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try {
      await deletePost(post.id);
      router.push(writeBase);
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-3xl px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }
  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-12 text-slate-400">{t("loading")}</main>;
  }
  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-red-600">{t("notFound")}</p>
        {error && <p className="mt-2 text-sm text-slate-500">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-1px)] max-w-5xl flex-col px-4 py-4 sm:px-6">
      {/* Top bar — save is the single solid primary; status lifecycle is a quieter outline button. */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <a
          href={writeBase}
          className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("backToList")}</span>
        </a>
        <div className="flex items-center gap-2">
          <StatusPill status={post.status} label={t(`status${post.status}`)} />
          {post.status === "DRAFT" && (
            <StatusButton onClick={() => handleStatus("publish")} disabled={busy} tone="accent">
              {t("publish")}
            </StatusButton>
          )}
          {post.status === "PUBLISHED" && (
            <StatusButton onClick={() => handleStatus("unpublish")} disabled={busy} tone="amber">
              {t("unpublish")}
            </StatusButton>
          )}
          {post.status === "UNPUBLISHED" && (
            <StatusButton onClick={() => handleStatus("republish")} disabled={busy} tone="accent">
              {t("republish")}
            </StatusButton>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-accent-700 disabled:opacity-50"
          >
            {saved && <Check className="h-4 w-4" />}
            {saving ? t("saving") : saved ? t("saved") : t("save")}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title={t("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setSaved(false);
        }}
        maxLength={200}
        className="mt-5 w-full border-0 bg-transparent text-[28px] font-bold leading-tight tracking-tight text-slate-900 outline-none placeholder:text-slate-300 sm:text-[34px]"
        placeholder={t("titlePlaceholder")}
      />
      {post.status === "DRAFT" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-mono text-slate-300">kurl.me/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              setSaved(false);
            }}
            maxLength={200}
            className="w-44 rounded-md border border-slate-200 bg-slate-50/60 px-2 py-1 font-mono text-slate-600 outline-none transition-colors focus:border-accent-400 focus:bg-white"
          />
          <span className="text-[11px] text-slate-400">{t("slugHint")}</span>
        </div>
      ) : (
        <p className="mt-2 font-mono text-xs text-slate-400">kurl.me/{post.slug}</p>
      )}

      {/* Meta — labelled so tags / series read as deliberate fields, not bare boxes. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t("tags")}
          </label>
          <TagInput tags={tags} onChange={(v) => { setTags(v); setSaved(false); }} placeholder={t("tagsPlaceholder")} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t("series")}
          </label>
          <SeriesSelect
            value={seriesId}
            onChange={(v) => { setSeriesId(v); setSaved(false); }}
            noneLabel={t("seriesNone")}
            emptyHint={t("seriesEmptyHint")}
          />
        </div>
      </div>

      {/* Rich editor (Toast UI) — WYSIWYG/markdown with inline image upload (drop / paste / toolbar). */}
      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <MarkdownEditor
          initialValue={markdown}
          onChange={(md) => {
            setMarkdown(md);
            setSaved(false);
          }}
          onUploadImage={(blob) => uploadPostImage(post.id, blob as File)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </main>
  );
}

function StatusButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "accent" | "amber";
}) {
  // Outline so it reads as a secondary action next to the solid Save button.
  const cls =
    tone === "accent"
      ? "border-accent-300 text-accent-700 hover:bg-accent-50"
      : "border-amber-300 text-amber-700 hover:bg-amber-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

const STATUS_PILL: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PUBLISHED: "bg-accent-50 text-accent-700",
  UNPUBLISHED: "bg-amber-50 text-amber-700",
  SCHEDULED: "bg-blue-50 text-blue-700",
};

function StatusPill({ status, label }: { status: PostStatus; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${STATUS_PILL[status]}`}>
      {label}
    </span>
  );
}
