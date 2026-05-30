"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { uploadPostImage } from "@/modules/blog/api/post-images";
import { MarkdownEditor } from "@/modules/blog/components/editor/markdown-editor";
import { EditorHeader } from "@/modules/blog/components/editor/editor-header";
import { EditorMeta } from "@/modules/blog/components/editor/editor-meta";
import { usePostEditor } from "@/modules/blog/components/editor/use-post-editor";

export default function EditPostPage({ params }: { params: { id: string } }) {
  const t = useTranslations("postEditor");
  const { ready, authenticated } = useAuth();
  const { toast } = useToast();
  const ed = usePostEditor(Number(params.id), { ready, authenticated });

  if (!ready) return null;
  if (!authenticated) {
    return <main className="mx-auto max-w-3xl px-6 py-12 text-slate-600">{t("loginRequired")}</main>;
  }
  if (ed.loading) {
    return <main className="mx-auto max-w-3xl px-6 py-12 text-slate-400">{t("loading")}</main>;
  }
  if (!ed.post) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-red-600">{t("notFound")}</p>
        {ed.error && <p className="mt-2 text-sm text-slate-500">{ed.error}</p>}
      </main>
    );
  }

  const post = ed.post;

  return (
    <main className="mx-auto flex h-[calc(100dvh-1px)] max-w-5xl flex-col px-4 py-4 sm:px-6">
      <EditorHeader
        backHref={ed.writeBase}
        status={post.status}
        saving={ed.saving}
        saved={ed.saved}
        busy={ed.busy}
        onSave={ed.save}
        onChangeStatus={ed.changeStatus}
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
        className="mt-5 w-full border-0 bg-transparent text-[28px] font-bold leading-tight tracking-tight text-slate-900 outline-none placeholder:text-slate-300 sm:text-[34px]"
        placeholder={t("titlePlaceholder")}
      />

      <EditorMeta
        status={post.status}
        slug={ed.slug}
        onSlugChange={ed.setSlug}
        tags={ed.tags}
        onTagsChange={ed.setTags}
        seriesId={ed.seriesId}
        onSeriesChange={ed.setSeriesId}
      />

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <MarkdownEditor
          initialValue={ed.markdown}
          onChange={ed.setMarkdown}
          onUploadImage={(blob) => uploadPostImage(post.id, blob as File)}
          onUploadError={(msg) => toast(msg, "error")}
        />
      </div>

      {ed.error && <p className="mt-2 text-sm text-red-600">{ed.error}</p>}
    </main>
  );
}
