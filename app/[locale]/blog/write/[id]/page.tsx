"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { uploadPostImage } from "@/modules/blog/api/post-images";
import { MarkdownEditor } from "@/modules/blog/components/editor/markdown-editor";
import { EditorHeader } from "@/modules/blog/components/editor/editor-header";
import { PublishDialog } from "@/modules/blog/components/editor/publish-dialog";
import { usePostEditor } from "@/modules/blog/components/editor/use-post-editor";
import { Skeleton } from "@/modules/blog/components/skeleton";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const t = useTranslations("postEditor");
  const { ready, authenticated } = useAuth();
  const { toast } = useToast();
  const ed = usePostEditor(Number(params.id), { ready, authenticated });
  const [publishOpen, setPublishOpen] = useState(false);

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-[44rem] px-5 py-12 text-slate-600 dark:text-slate-300">{t("loginRequired")}</main>;
  }
  if (ed.loading) {
    // Mirror the editor's real shape (top bar → title → meta strip → body) so the post swaps in
    // without a jump, instead of a bare "loading…" line on this full-height surface.
    return (
      <main className="mx-auto flex h-[calc(100dvh-1px)] max-w-[44rem] flex-col px-5 pt-3" aria-busy>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <Skeleton className="h-6 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <Skeleton className="mt-6 h-9 w-3/4" />
        <div className="mt-3 flex gap-2 border-b border-slate-100 pb-5 dark:border-slate-800">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="mt-6 flex-1 space-y-3">
          {["w-full", "w-[92%]", "w-[97%]", "w-[60%]", "w-full", "w-[80%]"].map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
      </main>
    );
  }
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
      />

      {/* Clean writing surface: title flows straight into the body — no form strip. All publish
          metadata (cover · 요약 · 시리즈 · 태그 · slug) lives in the 발행 설정 dialog. */}
      <div className="-mx-5 mt-4 min-h-0 flex-1 overflow-hidden">
        <MarkdownEditor
          initialValue={ed.markdown}
          onChange={ed.setMarkdown}
          onUploadImage={(blob) => uploadPostImage(post.id, blob as File)}
          onUploadError={(msg) => toast(msg, "error")}
        />
      </div>

      {ed.error && <p className="mt-2 text-sm text-red-600">{ed.error}</p>}

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
        slug={ed.slug}
        onSlugChange={ed.setSlug}
        tags={ed.tags}
        onTagsChange={ed.setTags}
        seriesId={ed.seriesId}
        onSeriesChange={ed.setSeriesId}
        saving={ed.saving}
        busy={ed.busy}
        onSave={ed.save}
        onChangeStatus={ed.changeStatus}
        onSchedule={ed.schedule}
      />
    </main>
  );
}
