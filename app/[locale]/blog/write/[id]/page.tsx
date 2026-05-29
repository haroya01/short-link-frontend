"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Trash2 } from "lucide-react";
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
  type PostView,
} from "@/modules/blog/api/posts";
import { assignPostToSeries } from "@/modules/blog/api/series";
import { uploadPostImage } from "@/modules/blog/api/post-images";
import { blocksToMarkdown, markdownToBlocks } from "@/modules/blog/lib/markdown-to-blocks";
import { Markdown } from "@/modules/blog/components/markdown";
import { MarkdownToolbar } from "@/modules/blog/components/editor/markdown-toolbar";
import { TagInput } from "@/modules/blog/components/editor/tag-input";
import { SeriesSelect } from "@/modules/blog/components/editor/series-select";
import type { EditResult, Selection } from "@/modules/blog/components/editor/markdown-commands";
import { insertImage } from "@/modules/blog/components/editor/markdown-commands";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const t = useTranslations("postEditor");
  const router = useRouter();
  const { ready, authenticated } = useAuth();
  const postId = Number(params.id);

  const [post, setPost] = useState<PostView | null>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [mobileTab, setMobileTab] = useState<"write" | "preview">("write");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<Selection | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(postId)) return;
    setLoading(true);
    setError(null);
    try {
      const [p, blocks] = await Promise.all([getPost(postId), getBlocks(postId)]);
      setPost(p);
      setTitle(p.title);
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

  // Restore caret after a toolbar command rewrites the markdown.
  useEffect(() => {
    if (!pendingSelection.current) return;
    const ta = textareaRef.current;
    const sel = pendingSelection.current;
    pendingSelection.current = null;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(sel.start, sel.end);
    }
  }, [markdown]);

  function runCommand(producer: (value: string, sel: Selection) => EditResult) {
    const ta = textareaRef.current;
    const sel: Selection = ta
      ? { start: ta.selectionStart, end: ta.selectionEnd }
      : { start: markdown.length, end: markdown.length };
    const result = producer(markdown, sel);
    pendingSelection.current = result.selection;
    setMarkdown(result.value);
    setSaved(false);
  }

  async function handleImageUpload(file: File) {
    if (post == null || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPostImage(post.id, file);
      const alt = file.name.replace(/\.[^.]+$/, "");
      const ta = textareaRef.current;
      const sel: Selection = ta
        ? { start: ta.selectionStart, end: ta.selectionEnd }
        : { start: markdown.length, end: markdown.length };
      const result = insertImage(markdown, sel, url, alt);
      pendingSelection.current = result.selection;
      setMarkdown(result.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("imageError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function firstImage(files: FileList | null | undefined): File | null {
    if (!files) return null;
    for (const f of Array.from(files)) if (f.type.startsWith("image/")) return f;
    return null;
  }

  async function handleSave() {
    if (post == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePostMetadata(post.id, { title: title.trim(), tags });
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
      router.push("/write");
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
    <main className="mx-auto flex h-[calc(100vh-1px)] max-w-6xl flex-col px-4 py-4 sm:px-6">
      {/* Top bar */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <a
          href="/write"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-accent-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </a>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600">
            {t(`status${post.status}`)}
          </span>
          {post.status === "DRAFT" && (
            <StatusButton onClick={() => handleStatus("publish")} disabled={busy} tone="primary">
              {t("publish")}
            </StatusButton>
          )}
          {post.status === "PUBLISHED" && (
            <StatusButton onClick={() => handleStatus("unpublish")} disabled={busy} tone="amber">
              {t("unpublish")}
            </StatusButton>
          )}
          {post.status === "UNPUBLISHED" && (
            <StatusButton onClick={() => handleStatus("republish")} disabled={busy} tone="primary">
              {t("republish")}
            </StatusButton>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
          >
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

      {/* Title + meta */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setSaved(false);
        }}
        maxLength={200}
        className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-slate-300"
        placeholder={t("titlePlaceholder")}
      />
      <p className="mt-1 font-mono text-xs text-slate-400">/{post.slug}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_240px]">
        <TagInput tags={tags} onChange={(v) => { setTags(v); setSaved(false); }} placeholder={t("tagsPlaceholder")} />
        <SeriesSelect
          value={seriesId}
          onChange={(v) => { setSeriesId(v); setSaved(false); }}
          noneLabel={t("seriesNone")}
          emptyHint={t("seriesEmptyHint")}
        />
      </div>

      {/* Mobile tab toggle */}
      <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1 lg:hidden">
        {(["write", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mobileTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Editor + preview */}
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 ${
            mobileTab === "write" ? "flex" : "hidden lg:flex"
          }`}
        >
          <MarkdownToolbar
            run={runCommand}
            onImage={() => fileInputRef.current?.click()}
            uploading={uploading}
          />
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => {
              setMarkdown(e.target.value);
              setSaved(false);
            }}
            onPaste={(e) => {
              const file = firstImage(e.clipboardData?.files);
              if (file) {
                e.preventDefault();
                void handleImageUpload(file);
              }
            }}
            onDrop={(e) => {
              const file = firstImage(e.dataTransfer?.files);
              if (file) {
                e.preventDefault();
                void handleImageUpload(file);
              }
            }}
            className="min-h-[40vh] flex-1 resize-none p-4 font-mono text-sm leading-relaxed outline-none"
            placeholder={t("bodyPlaceholder")}
          />
        </section>

        <section
          className={`min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-6 ${
            mobileTab === "preview" ? "block" : "hidden lg:block"
          }`}
        >
          {markdown.trim() ? (
            <div className="prose-post">
              <Markdown>{markdown}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t("previewEmpty")}</p>
          )}
        </section>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageUpload(file);
        }}
      />
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
  tone: "primary" | "amber";
}) {
  const cls =
    tone === "primary"
      ? "bg-accent-600 text-white hover:bg-accent-700"
      : "border border-amber-400 text-amber-700 hover:bg-amber-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}
