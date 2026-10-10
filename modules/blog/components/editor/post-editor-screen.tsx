"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { importPostImage, uploadPostImage } from "@/modules/blog/api/post-images";
import { MarkdownEditor } from "@/modules/blog/components/editor/markdown-editor";
import { EditorTitle } from "@/modules/blog/components/editor/editor-title";
import { EditorHeader } from "@/modules/blog/components/editor/editor-header";
import { PublishDialog } from "@/modules/blog/components/editor/publish-dialog";
import { PreviewLinkButton } from "@/modules/blog/components/editor/preview-link-button";
import { usePostEditor } from "@/modules/blog/components/editor/use-post-editor";
import { useTagSuggestions } from "@/modules/blog/components/editor/use-tag-suggestions";
import { CanvasTags } from "@/modules/blog/components/editor/canvas-tags";
import { EditorSkeleton } from "@/modules/blog/components/editor/editor-skeleton";
import { EditConflictDialog } from "@/modules/blog/components/editor/edit-conflict-dialog";
import { TakenDownNotice } from "@/modules/blog/components/editor/taken-down-notice";
import { markdownLead } from "@/modules/blog/lib/markdown-lead";
import { firstImageUrl } from "@/modules/blog/lib/markdown-image";
import { extractExternalLinks } from "@/modules/blog/lib/post-links";
import { ErrorState } from "@/components/common/error-state";

/** The writing surface for an existing post (`postId`) or a new one that is created on its first save (`null`). */
export function PostEditorScreen({ postId, initialMarkdown }: { postId: number | null; initialMarkdown?: string }) {
  const t = useTranslations("postEditor");
  const { ready, authenticated, me } = useAuth();
  const { toast } = useToast();
  const ed = usePostEditor(postId, { ready, authenticated, username: me?.username, initialMarkdown });
  const [publishOpen, setPublishOpen] = useState(false);
  const focusBody = useRef<(() => void) | null>(null);
  // External links the author wrote in the body — offered for kurl auto-shortening in the publish
  // dialog. Computed before the early returns so the hook order stays stable.
  const bodyLinks = useMemo(() => extractExternalLinks(ed.markdown), [ed.markdown]);
  // First body image — offered as a one-tap cover suggestion in the publish dialog.
  const coverSuggestion = useMemo(() => firstImageUrl(ed.markdown), [ed.markdown]);
  // Followed + popular tags, shared by the canvas tags line and the publish dialog (one fetch).
  const tagSuggestions = useTagSuggestions();
  const toldReloads = useRef(0);
  useEffect(() => {
    if (ed.remoteReloads <= toldReloads.current) return;
    toldReloads.current = ed.remoteReloads;
    toast(t("editConflictReloaded"));
  }, [ed.remoteReloads, toast, t]);

  if (!ready) return null;
  // Mirror the editor's real shape so the post swaps in without a jump.
  if (ed.loading) return <EditorSkeleton />;
  if (!ed.post && postId != null) {
    return (
      <main className="mx-auto max-w-[44rem] px-5 py-12">
        {ed.loadFailed ? (
          <ErrorState onRetry={() => void ed.reload()} />
        ) : (
          <p className="text-red-600 dark:text-red-400">{t("notFound")}</p>
        )}
      </main>
    );
  }

  const post = ed.post;
  const status = post?.status ?? "DRAFT";
  const takenDown = post?.takenDown === true;

  // 글을 frontmatter 포함 .md 로 다운로드 — 데이터 소유권(언제든 들고 나갈 수 있는 문).
  // liveMarkdown(에디터의 동기 getter)을 우선해 마지막 키스트로크까지 담는다.
  function exportMarkdown() {
    const md = ed.liveMarkdown.current?.() ?? ed.markdown;
    const fm = [
      "---",
      `title: "${ed.title.replace(/"/g, '\\"')}"`,
      ed.tags.length > 0 ? `tags: [${ed.tags.join(", ")}]` : null,
      post?.publishedAt ? `published: ${post.publishedAt}` : null,
      `slug: ${ed.slug || post?.slug || ""}`,
      "---",
      "",
      "",
    ]
      .filter((l) => l != null)
      .join("\n");
    const blob = new Blob([fm + md + "\n"], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ed.slug || post?.slug || "post"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    // Write = read: the whole writing surface lives in the same centered 42rem reading band the post
    // ships in (§10.1). Title, meta and body share one measure and there is no boxed-in editor frame —
    // a quiet paper column, not a SaaS form. The body editor re-centers at the same width (globals.css)
    // and breaks out of the page padding so its text aligns with the title above it.
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[44rem] flex-col px-5 pt-3">
      <EditorHeader
        backHref={ed.writeBase}
        postId={post?.id ?? null}
        status={status}
        takenDown={takenDown}
        saving={ed.saving}
        saved={ed.saved}
        lastSavedAt={ed.lastSavedAt}
        busy={ed.busy}
        onSave={ed.save}
        onBack={ed.leave}
        onOpenPublish={() => setPublishOpen(true)}
        onRestoreRevision={ed.restoreRevision}
        onExport={exportMarkdown}
        onDelete={ed.remove}
      />

      {takenDown && <TakenDownNotice className="mt-3" />}

      {ed.kept && (
        <div
          data-testid="editor-kept"
          className="mt-3 flex items-center justify-between gap-3 rounded-surface border border-slate-200 px-3 py-2 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300"
        >
          <span>{t("keptNotice")}</span>
          <span className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={ed.restoreKept}
              className="focus-ring rounded font-medium text-accent-700 hover:underline dark:text-accent-300"
            >
              {t("keptRestore")}
            </button>
            <button
              type="button"
              onClick={ed.discardKept}
              className="focus-ring rounded text-slate-500 hover:underline dark:text-slate-400"
            >
              {t("keptDiscard")}
            </button>
          </span>
        </div>
      )}

      <EditorTitle
        value={ed.title}
        onChange={ed.setTitle}
        onContinue={() => focusBody.current?.()}
        placeholder={t("titlePlaceholder")}
      />
      {/* Title length is capped at 200; surface the count only as it approaches the cap so the clean
          masthead isn't cluttered for a normal title. */}
      {ed.title.length > 160 && (
        <p className="mt-1 text-right text-[11px] tabular-nums text-amber-600 dark:text-amber-400">
          {ed.title.length}/200
        </p>
      )}

      {/* One quiet tags line under the title so topics are visible (and editable) while writing, not
          hidden behind the 발행 button. Shares ed.tags with the publish dialog — one source of truth. */}
      <CanvasTags tags={ed.tags} onChange={ed.setTags} suggestions={tagSuggestions} />

      {/* Clean writing surface: title flows straight into the body — no form strip. All publish
          metadata (cover · 요약 · 시리즈 · 태그 · slug) lives in the 발행 설정 dialog. */}
      <div className="-mx-5 mt-4 min-h-0 flex-1 overflow-hidden">
        <MarkdownEditor
          // Remount on load / revision-restore so the editor reseeds from the fresh content (Tiptap
          // only reads initialValue at mount). reloadKey bumps on load()/restore, never on typing.
          key={ed.reloadKey}
          initialValue={ed.markdown}
          onChange={ed.setMarkdown}
          onEdit={ed.markDirty}
          liveMarkdownRef={ed.liveMarkdown}
          focusEditorRef={focusBody}
          onUploadImage={async (blob) => uploadPostImage((await ed.ensurePost()).id, blob as File)}
          // Pasted-from-Notion images carry an external <img src> (expiring/CORS-locked) — re-host it.
          onImportImageUrl={async (url) => importPostImage((await ed.ensurePost()).id, url)}
          onUploadError={(msg) => toast(msg, "error")}
        />
      </div>

      {/* While the publish dialog is open it surfaces the error in its own footer — don't double it here. */}
      {ed.error && !publishOpen && <p className="mt-2 text-sm text-red-600">{ed.error}</p>}

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        status={status}
        takenDown={takenDown}
        scheduledAt={post?.scheduledAt ?? null}
        title={ed.title}
        cover={ed.coverUrl}
        onCoverChange={ed.setCover}
        onUploadCover={async (file) => uploadPostImage((await ed.ensurePost()).id, file)}
        onCoverPrefill={ed.setCoverRaw}
        coverSuggestion={coverSuggestion}
        excerpt={ed.excerpt}
        onExcerptChange={ed.setExcerpt}
        onExcerptPrefill={ed.setExcerptRaw}
        excerptSuggestion={markdownLead(ed.markdown)}
        slug={ed.slug}
        onSlugChange={ed.setSlug}
        tags={ed.tags}
        onTagsChange={ed.setTags}
        tagSuggestions={tagSuggestions}
        seriesId={ed.seriesId}
        onSeriesChange={ed.setSeriesId}
        bodyLinks={bodyLinks}
        previewAction={
          post && post.status !== "PUBLISHED" && !takenDown ? (
            <PreviewLinkButton postId={post.id} username={me?.username} onSave={ed.save} />
          ) : null
        }
        error={ed.error}
        saving={ed.saving}
        busy={ed.busy}
        onSave={ed.save}
        onChangeStatus={ed.changeStatus}
        onCancelSchedule={ed.cancelSchedule}
        onSchedule={async (iso, opts) => {
          // Confirm the parked publish with its exact date/time — the SCHEDULED badge alone is easy to
          // miss right after the action.
          const ok = await ed.schedule(iso, opts);
          if (ok) toast(t("scheduledToast", { when: new Date(iso).toLocaleString() }), "success");
          return ok;
        }}
      />
      {ed.confirmDialog}
      <EditConflictDialog
        open={ed.conflict}
        onLoadLatest={ed.loadLatest}
        onOverwrite={async () => {
          if (await ed.overwriteMine()) toast(t("editConflictOverwritten"), "success");
        }}
      />
    </main>
  );
}
