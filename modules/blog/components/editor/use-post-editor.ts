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
import { shortenUrl } from "@/lib/api/links";
import { ApiError } from "@/lib/api/client";
import { postHref } from "@/modules/blog/components/feed-card";
import { rewriteMarkdownLinks } from "@/modules/blog/lib/post-links";
import { blocksToMarkdown, markdownToBlocks } from "@/modules/blog/lib/markdown-to-blocks";
import { stampPublishCelebration } from "@/modules/blog/lib/celebrate-publish";
import { normalizeSlugInput, slugForSave } from "@/modules/blog/lib/slug";
import { setEditorDirty } from "@/modules/blog/lib/editor-dirty-store";
import { useConfirm } from "@/components/ui/use-confirm";

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
  const [confirm, confirmDialog] = useConfirm();

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
  // 마지막 저장이 "언제"였는지 — saved 가 2초 뒤 꺼진 뒤에도 헤더가 시각으로 안심시켜 준다.
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Unsaved-edits flag, distinct from `saved` (which is also false right after load) — drives autosave.
  const [dirty, setDirty] = useState(false);
  // The /write list path with the current prefix preserved (locale + /blog-preview on the apex).
  const [writeBase, setWriteBase] = useState("/write");
  // The editor registers a synchronous markdown getter here. save() reads it instead of the debounced
  // `markdown` state so a Save/Publish fired right after an edit (or with the editor still focused)
  // serializes the LATEST content — not a stale closure (the source of dropped last-keystroke saves).
  const liveMarkdown = useRef<(() => string) | null>(null);
  // The in-flight save() promise, so overlapping callers (autosave + a Publish/leave firing mid-save)
  // join it and then re-save the latest content — never treating an incomplete or stale-snapshot save
  // as a success. Cleared in the run's finally.
  const inFlightSave = useRef<Promise<boolean> | null>(null);
  // Bumped on load/restore so the page can remount the editor with fresh content — Tiptap seeds from
  // initialValue only at mount, so without this a revision restore updates state but the editor keeps
  // showing the old doc.
  const [reloadKey, setReloadKey] = useState(0);
  // Signature of the last successfully-saved payload — skip an autosave that would re-send identical
  // content (the idle effect re-fires on unrelated dep changes; a failing endpoint shouldn't thrash).
  const lastSaved = useRef<string>("");
  // 편집 시퀀스 — 저장이 도는 사이 들어온 타이핑을 감지한다. save() 시작 시점의 값과 완료 시점의
  // 값이 다르면 그 사이 새 편집이 있었다는 뜻이라 dirty 를 지우지 않는다(무경고 손실 방지).
  const editSeq = useRef(0);
  // 자동저장 실패 제어: 연속 실패 수(백오프 지연)와 정지 플래그. 슬러그 중복·세션 만료 같은
  // 결정적(4xx) 실패는 즉시 정지해 ~2초 무한 재전송을 막고, 다음 편집(touchDirty)에서 해제한다.
  const failStreak = useRef(0);
  const autoRetryBlocked = useRef(false);

  useEffect(() => {
    const i = window.location.pathname.indexOf("/write");
    if (i >= 0) setWriteBase(window.location.pathname.slice(0, i + "/write".length));
  }, []);

  // Dirty-marking setters — the view just sets values; this resets "saved" and arms autosave.
  const touchDirty = () => {
    setSaved(false);
    setDirty(true);
    editSeq.current += 1;
    // 사용자가 내용을 바꿨으니 정지됐던 자동저장 재시도를 다시 허용하고 백오프를 초기화.
    failStreak.current = 0;
    autoRetryBlocked.current = false;
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
    // 결정적(4xx)·과다 실패로 정지된 상태면 재무장하지 않는다 — 다음 편집(touchDirty)이 해제한다.
    if (autoRetryBlocked.current) return;
    // 연속 실패 시 지수 백오프 — 실패하는 페이로드를 ~2초마다 무한 재전송하지 않도록 간격을 늘린다.
    const delay = failStreak.current === 0 ? 1800 : Math.min(1800 * 2 ** failStreak.current, 30000);
    const id = window.setTimeout(() => void save(), delay);
    return () => window.clearTimeout(id);
    // save is intentionally omitted — content deps re-arm the timer with the latest closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, markdown, slug, tags, seriesId, coverUrl, excerpt, post, saving, busy]);

  // Returns true when the content is persisted (a successful save, or already-saved identical content),
  // false when the save failed — so a lifecycle action (Publish/Schedule) or leave() can hold instead
  // of proceeding on a stale snapshot or dropping edits.
  async function save(): Promise<boolean> {
    if (post == null) return false;
    // A save is already in flight — join it, then re-run so this caller persists the LATEST content
    // (a Publish/leave fired mid-autosave must not treat the in-flight, possibly-stale save as its own).
    const pending = inFlightSave.current;
    if (pending) {
      await pending;
      return save();
    }
    // Pull the freshest markdown straight from the editor (falls back to state pre-mount).
    const md = liveMarkdown.current?.() ?? markdown;
    // 이 저장이 담는 편집 지점. 아래 비동기 요청이 도는 사이 새 타이핑이 들어오면 editSeq 가 커진다.
    const seqAtSnapshot = editSeq.current;
    const slugPart = post.status === "DRAFT" ? slugForSave(slug) : post.slug;
    // Skip a save whose payload is identical to the last successful one — the idle autosave effect
    // re-fires on unrelated dep changes, and a persistently-failing endpoint shouldn't re-send the
    // same content on every keystroke.
    const sig = JSON.stringify([title.trim(), slugPart, tags, excerpt.trim(), coverUrl ?? "", seriesId, md]);
    if (sig === lastSaved.current) {
      // 이미 저장된 내용과 동일 — 저장 중 들어온 무변화 flush(예: onBlur)가 남긴 헛 dirty 를 정리하고
      // 성공으로 간주(발행/이탈 가드가 이미 저장된 내용을 실패로 오인하지 않도록).
      setDirty(false);
      return true;
    }
    const run = (async (): Promise<boolean> => {
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
        failStreak.current = 0;
        autoRetryBlocked.current = false;
        // 저장이 도는 사이 새 편집이 들어왔으면 dirty 를 유지한다 — 안 그러면 그 타이핑이 무경고로
        // 사라지고 '저장됨' 이 잘못 뜬다. dirty 가 남으면 자동저장이 곧 최신 내용으로 다시 돈다.
        if (editSeq.current === seqAtSnapshot) {
          setDirty(false);
          setSaved(true);
          setLastSavedAt(new Date());
          window.setTimeout(() => setSaved(false), 2000);
        }
        return true;
      } catch (e) {
        // A duplicate slug (same author) returns 409 — show a fixable hint, not a raw "HTTP 409".
        if (e instanceof ApiError && e.status === 409) setError(t("slugTaken"));
        else setError(e instanceof Error ? e.message : "save failed");
        // 자동저장 무한 재시도 차단: 4xx(사용자 개입이 필요한 결정적 실패)는 즉시 정지하고, 그 밖의
        // 실패(네트워크·5xx)는 백오프로 몇 번만 재시도 후 정지. 정지는 다음 편집에서 풀린다.
        failStreak.current += 1;
        const deterministic = e instanceof ApiError && e.status >= 400 && e.status < 500;
        if (deterministic || failStreak.current >= 5) autoRetryBlocked.current = true;
        return false;
      } finally {
        setSaving(false);
        inFlightSave.current = null;
      }
    })();
    inFlightSave.current = run;
    return run;
  }

  // Tab close / refresh / hard navigation with unsaved edits → native "leave site?" prompt. Drafts
  // are mostly covered by autosave, but the 1.8s debounce window and every non-DRAFT edit (which only
  // persists on an explicit action) would otherwise discard silently.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Publish the dirty flag so the surrounding chrome (header logo / Write CTA, mobile sidebar) — which
  // soft-navigates and so never triggers the beforeunload above — can fall back to a hard navigation
  // that does. Cleared on unmount so a leftover flag doesn't guard navigation on other pages.
  useEffect(() => {
    setEditorDirty(dirty);
    return () => setEditorDirty(false);
  }, [dirty]);

  // Leave the editor for the list. Save a dirty DRAFT first so the last keystrokes (still inside the
  // 1.8s autosave debounce) aren't lost to the full-page back navigation — the reported data-loss path.
  // Published posts persist only via explicit actions, so a dirty one asks before discarding instead
  // of navigating the edits away without a word.
  async function leave() {
    if (dirty && post?.status === "DRAFT") {
      // 저장 실패 시 확인 없이 떠나면 편집이 사라진다 — 에디터에 머물러 에러(error)를 보여준다.
      if (!(await save())) return;
    } else if (dirty && post != null) {
      const ok = await confirm({
        title: t("unsavedLeaveTitle"),
        description: t("unsavedLeaveDescription"),
        confirmLabel: t("unsavedLeaveAction"),
        destructive: true,
      });
      if (!ok) return;
    }
    router.push(writeBase);
  }

  /**
   * Auto-shorten the given in-post links through the kurl system right before going public, so every
   * click is tracked (and surfaces in the post's analytics). Each URL is created as a kurl short link
   * and swapped into the saved body. A link that fails to shorten is left as the author wrote it — a
   * tracking miss never blocks publishing. Returns the rewritten markdown (or null if nothing changed).
   */
  async function applyLinkShortening(urls: string[]): Promise<string | null> {
    if (post == null || urls.length === 0) return null;
    const md = liveMarkdown.current?.() ?? markdown;
    const map: Record<string, string> = {};
    for (const url of urls) {
      try {
        map[url] = (await shortenUrl({ url })).shortUrl;
      } catch {
        /* keep the original link — partial coverage beats a blocked publish */
      }
    }
    if (Object.keys(map).length === 0) return null;
    const newMd = rewriteMarkdownLinks(md, map);
    await replaceBlocks(post.id, markdownToBlocks(newMd));
    return newMd;
  }

  /** Returns true once the status change succeeds — the caller can then close the publish dialog. */
  async function changeStatus(
    action: StatusAction,
    opts?: { shortenLinks?: string[] },
  ): Promise<boolean> {
    if (post == null || busy) return false;
    const goingPublic = action === "publish" || action === "republish";
    // Publishing from a draft needs a title (backend enforces it too; this gives an immediate localized
    // hint). Republish keeps the post's existing title, so it isn't re-checked here.
    if (action === "publish" && !title.trim()) {
      setError(t("titleRequired"));
      return false;
    }
    // Going public needs at least one topic (tag). The reader's discovery — topic feeds, the author
    // rail, related posts — is tag-driven, so an untagged public post is effectively undiscoverable.
    if (goingPublic && tags.length === 0) {
      setError(t("tagsRequired"));
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      // Shorten in-post links through kurl before the post goes live (skipped for unpublish/backToDraft).
      if (goingPublic && opts?.shortenLinks?.length) await applyLinkShortening(opts.shortenLinks);
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
        // 첫 발행만 도착지에서 축하 연출 1회 — 재발행은 이미 나갔던 글이라 조용히 지나간다.
        if (action === "publish") stampPublishCelebration(updated.slug);
        window.location.assign(postHref(username, updated.slug, locale));
      }
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError(t("slugTaken"));
      else setError(e instanceof Error ? e.message : `${action} failed`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** Returns true once the post is parked for a future publish — the caller can then confirm the time. */
  async function schedule(scheduledAt: string, opts?: { shortenLinks?: string[] }): Promise<boolean> {
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
    const at = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
      setError(t("scheduleInvalid"));
      return false;
    }
    // The picker hands us a zoneless datetime-local string ("2026-07-12T15:00"); the API wants an ISO
    // instant. `new Date(...)` reads that string in the author's local zone, so toISOString() pins the
    // exact instant they picked — no server-side zone guessing.
    const scheduledAtIso = at.toISOString();
    setBusy(true);
    setError(null);
    try {
      // Persist edits first so the scheduled snapshot matches what's on screen, then park it.
      await save();
      // Shorten in-post links into the scheduled snapshot; reseed the editor so the author (who stays
      // here after scheduling) sees the rewritten links rather than stale originals.
      if (opts?.shortenLinks?.length) {
        const newMd = await applyLinkShortening(opts.shortenLinks);
        if (newMd != null) {
          setMarkdownRaw(newMd);
          setReloadKey((k) => k + 1);
        }
      }
      setPost(await schedulePost(post.id, scheduledAtIso));
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
    if (!(await confirm({ title: t("revisionRestoreConfirm"), confirmLabel: t("revisionRestore") }))) return;
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
    if (!(await confirm({ title: t("deleteConfirm"), destructive: true }))) return;
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
    // Raw cover setter — bypasses touchDirty so the publish dialog's auto-cover (body's first image)
    // doesn't mark the post dirty. Used for onCoverPrefill.
    setCoverRaw,
    excerpt,
    setExcerpt,
    // Raw excerpt setter — bypasses touchDirty so a machine prefill (publish dialog open) doesn't mark
    // the post dirty. Used for onExcerptPrefill.
    setExcerptRaw,
    loading,
    saving,
    busy,
    error,
    saved,
    lastSavedAt,
    writeBase,
    save,
    changeStatus,
    schedule,
    restoreRevision,
    remove,
    confirmDialog,
  };
}
