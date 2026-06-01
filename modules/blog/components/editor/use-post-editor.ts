"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  backToDraftPost,
  deletePost,
  getBlocks,
  getPost,
  publishPost,
  replaceBlocks,
  republishPost,
  restoreRevision as restoreRevisionApi,
  schedulePost,
  unpublishPost,
  updatePostMetadata,
  type PostView,
} from "@/modules/blog/api/posts";
import { assignPostToSeries } from "@/modules/blog/api/series";
import { blocksToMarkdown, markdownToBlocks } from "@/modules/blog/lib/markdown-to-blocks";
import { normalizeSlugInput, slugForSave } from "@/modules/blog/lib/slug";

export type StatusAction = "publish" | "unpublish" | "republish" | "backToDraft";

/**
 * The post editor's controller: owns loading, the editable fields, dirty tracking, and the
 * save / status / delete actions. The page is left as pure presentation. Field setters mark the
 * draft dirty (clear "saved") so the view never has to manage that. Adding an action or field
 * touches only this hook, not the view.
 */
export function usePostEditor(
  postId: number,
  { ready, authenticated }: { ready: boolean; authenticated: boolean },
) {
  const t = useTranslations("postEditor");
  const router = useRouter();

  const [post, setPost] = useState<PostView | null>(null);
  const [title, setTitleRaw] = useState("");
  const [slug, setSlugRaw] = useState("");
  const [markdown, setMarkdownRaw] = useState("");
  const [tags, setTagsRaw] = useState<string[]>([]);
  const [seriesId, setSeriesIdRaw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // The /write list path with the current prefix preserved (locale + /blog-preview on the apex).
  const [writeBase, setWriteBase] = useState("/write");

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

  // Dirty-marking setters — the view just sets values; "saved" resets here.
  const setTitle = (v: string) => {
    setTitleRaw(v);
    setSaved(false);
  };
  const setSlug = (v: string) => {
    setSlugRaw(normalizeSlugInput(v));
    setSaved(false);
  };
  const setMarkdown = (v: string) => {
    setMarkdownRaw(v);
    setSaved(false);
  };
  const setTags = (v: string[]) => {
    setTagsRaw(v);
    setSaved(false);
  };
  const setSeriesId = (v: number | null) => {
    setSeriesIdRaw(v);
    setSaved(false);
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(postId)) return;
    setLoading(true);
    setError(null);
    try {
      const [p, blocks] = await Promise.all([getPost(postId), getBlocks(postId)]);
      setPost(p);
      setTitleRaw(p.title);
      setSlugRaw(p.slug);
      setMarkdownRaw(blocksToMarkdown(blocks));
      setTagsRaw(p.tags ?? []);
      setSeriesIdRaw(p.seriesId ?? null);
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

  async function save() {
    if (post == null || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Slug is editable only while DRAFT (frozen once public).
      const updated = await updatePostMetadata(post.id, {
        title: title.trim(),
        tags,
        // Trim edge hyphens the live input tolerates so the slug matches the backend regex.
        ...(post.status === "DRAFT" ? { slug: slugForSave(slug) } : {}),
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

  async function changeStatus(action: StatusAction) {
    if (post == null || busy) return;
    // Going public needs a title (backend enforces it too; this gives an immediate localized hint).
    if (action === "publish" && !title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated =
        action === "publish"
          ? await publishPost(post.id)
          : action === "unpublish"
            ? await unpublishPost(post.id)
            : action === "backToDraft"
              ? await backToDraftPost(post.id)
              : await republishPost(post.id);
      setPost(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function schedule(scheduledAt: string) {
    if (post == null || busy) return;
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Persist edits first so the scheduled snapshot matches what's on screen, then park it.
      await save();
      setPost(await schedulePost(post.id, scheduledAt));
    } catch (e) {
      setError(e instanceof Error ? e.message : "schedule failed");
    } finally {
      setBusy(false);
    }
  }

  async function restoreRevision(versionNumber: number) {
    if (post == null || busy) return;
    if (!window.confirm(t("revisionRestoreConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await restoreRevisionApi(post.id, versionNumber);
      // Restore replaces server content with the revision's snapshot — reload so the editor reflects it.
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "restore failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
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

  return {
    post,
    title,
    setTitle,
    slug,
    setSlug,
    markdown,
    setMarkdown,
    tags,
    setTags,
    seriesId,
    setSeriesId,
    loading,
    saving,
    busy,
    error,
    saved,
    writeBase,
    save,
    changeStatus,
    schedule,
    restoreRevision,
    remove,
  };
}
