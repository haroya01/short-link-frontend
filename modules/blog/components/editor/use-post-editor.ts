"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import { ApiError } from "@/lib/api/client";
import { postHref } from "@/modules/blog/components/feed-card";
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
  {
    ready,
    authenticated,
    username,
  }: { ready: boolean; authenticated: boolean; username?: string | null },
) {
  const t = useTranslations("postEditor");
  const router = useRouter();
  const locale = useLocale();

  const [post, setPost] = useState<PostView | null>(null);
  const [title, setTitleRaw] = useState("");
  const [slug, setSlugRaw] = useState("");
  const [markdown, setMarkdownRaw] = useState("");
  const [tags, setTagsRaw] = useState<string[]>([]);
  const [seriesId, setSeriesIdRaw] = useState<number | null>(null);
  const [coverUrl, setCoverRaw] = useState<string | null>(null);
  const [excerpt, setExcerptRaw] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Unsaved-edits flag, distinct from `saved` (which is also false right after load) — drives autosave.
  const [dirty, setDirty] = useState(false);
  // The /write list path with the current prefix preserved (locale + /blog-preview on the apex).
  const [writeBase, setWriteBase] = useState("/write");
  // The editor registers a synchronous markdown getter here. save() reads it instead of the debounced
  // `markdown` state so a Save/Publish fired right after an edit (or with the editor still focused)
  // serializes the LATEST content — not a stale closure (the source of dropped last-keystroke saves).
  const liveMarkdown = useRef<(() => string) | null>(null);
  // Bumped on load/restore so the page can remount the editor with fresh content — Tiptap seeds from
  // initialValue only at mount, so without this a revision restore updates state but the editor keeps
  // showing the old doc.
  const [reloadKey, setReloadKey] = useState(0);
  // Signature of the last successfully-saved payload — skip an autosave that would re-send identical
  // content (the idle effect re-fires on unrelated dep changes; a failing endpoint shouldn't thrash).
  const lastSaved = useRef<string>("");

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

  // Dirty-marking setters — the view just sets values; this resets "saved" and arms autosave.
  const touchDirty = () => {
    setSaved(false);
    setDirty(true);
  };
  const setTitle = (v: string) => {
    setTitleRaw(v);
    touchDirty();
  };
  const setSlug = (v: string) => {
    setSlugRaw(normalizeSlugInput(v));
    touchDirty();
  };
  const setMarkdown = (v: string) => {
    setMarkdownRaw(v);
    touchDirty();
  };
  const setTags = (v: string[]) => {
    setTagsRaw(v);
    touchDirty();
  };
  const setSeriesId = (v: number | null) => {
    setSeriesIdRaw(v);
    touchDirty();
  };
  const setCover = (v: string | null) => {
    setCoverRaw(v);
    touchDirty();
  };
  const setExcerpt = (v: string) => {
    setExcerptRaw(v);
    touchDirty();
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
      setCoverRaw(p.ogImageUrl ?? null);
      setExcerptRaw(p.excerpt ?? "");
      setDirty(false); // freshly loaded content isn't a pending edit
      lastSaved.current = ""; // new content baseline — let the first real edit save
      setReloadKey((k) => k + 1); // remount the editor so it seeds from the (re)loaded content
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

  // Draft autosave — persist edits after a short idle so nothing is lost. Drafts only: a published post
  // saves only on an explicit action, so the live post never changes out from under readers mid-edit.
  // Each edit re-arms the debounce; `dirty` clears on save → effect no-ops until the next edit.
  useEffect(() => {
    if (!post || post.status !== "DRAFT" || !dirty || saving || busy) return;
    const id = window.setTimeout(() => void save(), 1800);
    return () => window.clearTimeout(id);
    // save is intentionally omitted — content deps re-arm the timer with the latest closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, markdown, slug, tags, seriesId, coverUrl, excerpt, post, saving, busy]);

  async function save() {
    if (post == null || saving) return;
    // Pull the freshest markdown straight from the editor (falls back to state pre-mount).
    const md = liveMarkdown.current?.() ?? markdown;
    const slugPart = post.status === "DRAFT" ? slugForSave(slug) : post.slug;
    // Skip a save whose payload is identical to the last successful one — the idle autosave effect
    // re-fires on unrelated dep changes, and a persistently-failing endpoint shouldn't re-send the
    // same content on every keystroke.
    const sig = JSON.stringify([title.trim(), slugPart, tags, excerpt.trim(), coverUrl ?? "", seriesId, md]);
    if (sig === lastSaved.current) return;
    setSaving(true);
    setError(null);
    try {
      // Slug is editable only while DRAFT (frozen once public).
      const updated = await updatePostMetadata(post.id, {
        title: title.trim(),
        tags,
        excerpt: excerpt.trim(),
        ogImageUrl: coverUrl ?? "",
        // Trim edge hyphens the live input tolerates so the slug matches the backend regex.
        ...(post.status === "DRAFT" ? { slug: slugForSave(slug) } : {}),
      });
      await replaceBlocks(post.id, markdownToBlocks(md));
      await assignPostToSeries(post.id, seriesId, post.seriesId ?? null);
      setPost({ ...updated, seriesId });
      lastSaved.current = sig;
      setDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      // A duplicate slug (same author) returns 409 — show a fixable hint, not a raw "HTTP 409".
      if (e instanceof ApiError && e.status === 409) setError(t("slugTaken"));
      else setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  // Leave the editor for the list. Save a dirty DRAFT first so the last keystrokes (still inside the
  // 1.8s autosave debounce) aren't lost to the full-page back navigation — the reported data-loss path.
  // Published posts persist only via explicit actions, so they navigate without an implicit save.
  async function leave() {
    if (dirty && post?.status === "DRAFT") {
      try {
        await save();
      } catch {
        /* error is already surfaced via setError; still let the user leave */
      }
    }
    router.push(writeBase);
  }

  async function changeStatus(action: StatusAction) {
    if (post == null || busy) return;
    const goingPublic = action === "publish" || action === "republish";
    // Publishing from a draft needs a title (backend enforces it too; this gives an immediate localized
    // hint). Republish keeps the post's existing title, so it isn't re-checked here.
    if (action === "publish" && !title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    // Going public needs at least one topic (tag). The reader's discovery — topic feeds, the author
    // rail, related posts — is tag-driven, so an untagged public post is effectively undiscoverable.
    if (goingPublic && tags.length === 0) {
      setError(t("tagsRequired"));
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
      // Just went live → drop the writer straight onto the published post (the reader view), so
      // publishing ends on "here's my post", not back in the editor. Full assign covers the
      // cross-subdomain prod URL (postHref returns an absolute origin there).
      if (updated.status === "PUBLISHED" && username) {
        window.location.assign(postHref(username, updated.slug, locale));
        return;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError(t("slugTaken"));
      else setError(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  }

  /** Returns true once the post is parked for a future publish — the caller can then confirm the time. */
  async function schedule(scheduledAt: string): Promise<boolean> {
    if (post == null || busy) return false;
    if (!title.trim()) {
      setError(t("titleRequired"));
      return false;
    }
    // Scheduling is a deferred publish → same topic requirement as publishing now.
    if (tags.length === 0) {
      setError(t("tagsRequired"));
      return false;
    }
    // Reject a past instant up front (the datetime-local `min` is only advisory and editable).
    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      setError(t("scheduleInvalid"));
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      // Persist edits first so the scheduled snapshot matches what's on screen, then park it.
      await save();
      setPost(await schedulePost(post.id, scheduledAt));
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError(t("slugTaken"));
      else setError(e instanceof Error ? e.message : "schedule failed");
      return false;
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
    liveMarkdown,
    reloadKey,
    leave,
    tags,
    setTags,
    seriesId,
    setSeriesId,
    coverUrl,
    setCover,
    excerpt,
    setExcerpt,
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
