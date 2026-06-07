"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { uploadPostImage } from "@/modules/blog/api/post-images";
import { MarkdownEditor } from "@/modules/blog/components/editor/markdown-editor";
import { EditorHeader } from "@/modules/blog/components/editor/editor-header";
import { PublishDialog } from "@/modules/blog/components/editor/publish-dialog";
import { PreviewLinkButton } from "@/modules/blog/components/editor/preview-link-button";
import { usePostEditor } from "@/modules/blog/components/editor/use-post-editor";
import { EditorSkeleton } from "@/modules/blog/components/editor/editor-skeleton";
import { markdownLead } from "@/modules/blog/lib/markdown-lead";
import { extractExternalLinks } from "@/modules/blog/lib/post-links";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const t = useTranslations("postEditor");
  const { ready, authenticated, me } = useAuth();
  const { toast } = useToast();
  const ed = usePostEditor(Number(params.id), { ready, authenticated, username: me?.username });
  const [publishOpen, setPublishOpen] = useState(false);
  // External links the author wrote in the body — offered for kurl auto-shortening in the publish
  // dialog. Computed before the early returns so the hook order stays stable.
  const bodyLinks = useMemo(() => extractExternalLinks(ed.markdown), [ed.markdown]);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-[44rem] px-5 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }
  // Mirror the editor's real shape so the post swaps in without a jump (shared with /write/new).
  if (ed.loading) return <EditorSkeleton />;
  if (!ed.post) {
    return (
      <main className="mx-auto max-w-[44rem] px-5 py-12">
        <p className="text-red-600 dark:text-red-400">{t("notFound")}</p>
        {ed.error && <p className="mt-2 text-sm text-slate-500">{ed.error}</p>}
      </main>
    );
  }

  const post = ed.post;

  return (
    // Write = read: the whole writing surface lives in the same centered 42rem reading band the post
    // ships in (§10.1). Title, meta and body share one measure and there is no boxed-in editor frame —
    // a quiet paper column, not a SaaS form. The body editor re-centers at the same width (globals.css)
    // and breaks out of the page padding so its text aligns with the title above it.
    <main className="mx-auto flex h-[calc(100dvh-1px)] max-w-[44rem] flex-col px-5 pt-3">
      <EditorHeader
        backHref={ed.writeBase}
        postId={post.id}
        status={post.status}
        saving={ed.saving}
        saved={ed.saved}
        busy={ed.busy}
        onSave={ed.save}
        onBack={ed.leave}
        onOpenPublish={() => setPublishOpen(true)}
        onRestoreRevision={ed.restoreRevision}
        onDelete={ed.remove}
      />

      <input
        type="text"
        value={ed.title}
        onChange={(e) => ed.setTitle(e.target.value)}
        maxLength={200}
        // Stop mobile Chrome from popping its autofill (address/card/wallet) bar over the keyboard
        // on a plain post-title field. data-* opt password managers out too.
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        // Same headline token as the published post <h1> (text-headline-sm→md, tracking-headline) so the
        // title you type is the title that ships.
        className="mt-6 w-full border-0 bg-transparent text-headline-sm font-semibold tracking-headline text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-100 dark:placeholder:text-slate-600 sm:text-headline-md"
        placeholder={t("titlePlaceholder")}
        aria-label={t("titlePlaceholder")}
      />
      {/* Title length is capped at 200; surface the count only as it approaches the cap so the clean
          masthead isn't cluttered for a normal title. */}
      {ed.title.length > 160 && (
        <p className="mt-1 text-right text-[11px] tabular-nums text-amber-600 dark:text-amber-400">
          {ed.title.length}/200
        </p>
      )}

      {/* Clean writing surface: title flows straight into the body — no form strip. All publish
          metadata (cover · 요약 · 시리즈 · 태그 · slug) lives in the 발행 설정 dialog. */}
      <div className="-mx-5 mt-4 min-h-0 flex-1 overflow-hidden">
        <MarkdownEditor
          // Remount on load / revision-restore so the editor reseeds from the fresh content (Tiptap
          // only reads initialValue at mount). reloadKey bumps on load()/restore, never on typing.
          key={ed.reloadKey}
          initialValue={ed.markdown}
          onChange={ed.setMarkdown}
          liveMarkdownRef={ed.liveMarkdown}
          onUploadImage={(blob) => uploadPostImage(post.id, blob as File)}
          onUploadError={(msg) => toast(msg, "error")}
        />
      </div>

      {/* While the publish dialog is open it surfaces the error in its own footer — don't double it here. */}
      {ed.error && !publishOpen && <p className="mt-2 text-sm text-red-600">{ed.error}</p>}

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        status={post.status}
        scheduledAt={post.scheduledAt}
        cover={ed.coverUrl}
        onCoverChange={ed.setCover}
        onUploadCover={(file) => uploadPostImage(post.id, file)}
        excerpt={ed.excerpt}
        onExcerptChange={ed.setExcerpt}
        excerptSuggestion={markdownLead(ed.markdown)}
        slug={ed.slug}
        onSlugChange={ed.setSlug}
        tags={ed.tags}
        onTagsChange={ed.setTags}
        seriesId={ed.seriesId}
        onSeriesChange={ed.setSeriesId}
        bodyLinks={bodyLinks}
        previewAction={
          post.status !== "PUBLISHED" ? (
            <PreviewLinkButton postId={post.id} username={me?.username} slug={ed.slug} />
          ) : null
        }
        error={ed.error}
        saving={ed.saving}
        busy={ed.busy}
        onSave={ed.save}
        onChangeStatus={ed.changeStatus}
        onSchedule={async (iso, opts) => {
          // Confirm the parked publish with its exact date/time — the SCHEDULED badge alone is easy to
          // miss right after the action.
          const ok = await ed.schedule(iso, opts);
          if (ok) toast(t("scheduledToast", { when: new Date(iso).toLocaleString() }), "success");
          return ok;
        }}
      />
      {ed.confirmDialog}
    </main>
  );
}
