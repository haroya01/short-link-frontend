"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { isValidUrl, setLinkOgOverride, setLinkTags, updateLink } from "@/lib/api";
import { useLinkDetail, useTags } from "@/lib/api/links.queries";
import { useApiErrorMessage } from "@/lib/error-messages";
import { SectionTabs } from "@/components/links/edit-link-dialog/section-tabs";
import { BasicSection } from "@/components/links/edit-link-dialog/sections/basic-section";
import { OgOverrideSection } from "@/components/links/edit-link-dialog/sections/og-override-section";
import { TagsSection } from "@/components/links/edit-link-dialog/sections/tags-section";
import { blankToNull, type Section } from "@/components/links/edit-link-dialog/utils";
import { Link } from "@/i18n/navigation";
import type { MyLink } from "@/types";

type Props = {
  link: MyLink | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Modal dialog for what a link IS — name, destination, tags, share card — saved in one submit,
 * calling each endpoint only when its slice changed. How it BEHAVES (password, expiry, scheduled
 * opening, visit options) lives in the stats page's link settings; the dialog links there.
 */
export function EditLinkDialog({ link, onClose, onSaved }: Props) {
  const t = useTranslations("edit");
  const errorMessage = useApiErrorMessage();
  const [section, setSection] = useState<Section>("basic");
  const [originalUrl, setOriginalUrl] = useState("");
  const [note, setNote] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const detailQuery = useLinkDetail(link?.shortCode);
  const tagsQuery = useTags({ enabled: !!link });
  const detail = detailQuery.data ?? null;
  const loadingDetail = detailQuery.isLoading;
  const tagSuggestions = useMemo(
    () => tagsQuery.data?.map((t) => t.name) ?? [],
    [tagsQuery.data],
  );

  // Reset form state synchronously when a new link opens — so the dialog shows the row's known
  // values immediately, before the detail fetch lands.
  useEffect(() => {
    if (!link) return;
    setSection("basic");
    setOriginalUrl(link.originalUrl);
    setOgTitle("");
    setOgDescription("");
    setOgImage("");
    setTags(link.tags ?? []);
    setNote("");
    setError(null);
  }, [link]);

  // Overlay detail-only fields once the fetch lands.
  useEffect(() => {
    if (!detail) return;
    setOgTitle(detail.ogTitleOverride ?? "");
    setOgDescription(detail.ogDescriptionOverride ?? "");
    setOgImage(detail.ogImageOverride ?? "");
    setTags(detail.tags ?? []);
    setNote(detail.note ?? "");
  }, [detail]);

  // Escape / backdrop / focus-trap / scroll-lock / portal are all handled by ConfirmDialog now.

  const ogPlaceholders = useMemo(
    () => ({
      title: detail?.ogTitle ?? "",
      description: detail?.ogDescription ?? "",
      image: detail?.ogImage ?? "",
    }),
    [detail],
  );

  if (!link) return null;

  // ConfirmDialog's onConfirm contract: resolve → it closes the dialog; throw → it stays open.
  // So we throw on validation/save failure (the inline error stays visible) and resolve on success
  // (onSaved refreshes the list + closes the parent).
  async function handleSave() {
    setError(null);
    if (!link) return;
    if (originalUrl.trim() && !isValidUrl(originalUrl.trim())) {
      setError(t("invalidUrl"));
      throw new Error("invalid-url");
    }
    setBusy(true);
    try {
      await applyBasic();
      await applyTags();
      await applyOgOverride();
      toast(t("saved"), "success");
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t("saveFailed")));
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function applyBasic() {
    if (!link) return;
    const trimmed = originalUrl.trim();
    const urlChanged = trimmed.length > 0 && trimmed !== link.originalUrl;
    const noteChanged = (detail?.note ?? "") !== note;
    if (!urlChanged && !noteChanged) return;
    await updateLink(link.shortCode, {
      originalUrl: urlChanged ? trimmed : undefined,
      note: noteChanged ? note : undefined,
    });
  }

  async function applyTags() {
    if (!link || !detail) return;
    const before = (detail.tags ?? []).slice().sort().join("|");
    const after = tags.slice().sort().join("|");
    if (before === after) return;
    await setLinkTags(link.shortCode, tags);
  }

  async function applyOgOverride() {
    if (!link || !detail) return;
    const next = {
      ogTitle: blankToNull(ogTitle),
      ogDescription: blankToNull(ogDescription),
      ogImage: blankToNull(ogImage),
    };
    const prev = {
      ogTitle: detail.ogTitleOverride,
      ogDescription: detail.ogDescriptionOverride,
      ogImage: detail.ogImageOverride,
    };
    if (
      next.ogTitle === prev.ogTitle &&
      next.ogDescription === prev.ogDescription &&
      next.ogImage === prev.ogImage
    ) {
      return;
    }
    await setLinkOgOverride(link.shortCode, next);
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={t("title")}
      maxWidthClass="max-w-md"
      confirmLabel={t("save")}
      cancelLabel={t("cancel")}
      confirmVariant="accent"
      confirmDisabled={loadingDetail}
      onConfirm={handleSave}
    >
      <p className="-mt-1 mb-3 font-mono text-xs text-slate-500 dark:text-slate-400">/{link.shortCode}</p>

      <SectionTabs active={section} onSelect={setSection} t={t} />

        {section === "basic" && (
          <BasicSection
            originalUrl={originalUrl}
            note={note}
            busy={busy}
            loadingDetail={loadingDetail}
            onOriginalUrlChange={setOriginalUrl}
            onNoteChange={setNote}
            t={t}
          />
        )}
        {section === "tags" && (
          <TagsSection
            tags={tags}
            suggestions={tagSuggestions}
            busy={busy}
            loadingDetail={loadingDetail}
            onChange={setTags}
            t={t}
          />
        )}
        {section === "og" && (
          <OgOverrideSection
            ogTitle={ogTitle}
            ogDescription={ogDescription}
            ogImage={ogImage}
            placeholders={ogPlaceholders}
            busy={busy}
            loadingDetail={loadingDetail}
            onTitleChange={setOgTitle}
            onDescriptionChange={setOgDescription}
            onImageChange={setOgImage}
            t={t}
          />
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 border-t border-slate-100 pt-3 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t.rich("behaviorHint", {
            settings: (chunks) => (
              <Link
                href={`/stats/${link.shortCode}#settings`}
                onClick={onClose}
                className="focus-ring rounded-sm font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
    </ConfirmDialog>
  );
}
