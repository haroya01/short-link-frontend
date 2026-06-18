"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  isValidUrl,
  setLinkOgOverride,
  setLinkProtection,
  setLinkTags,
  updateLink,
} from "@/lib/api";
import { useLinkDetail, useTags } from "@/lib/api/links.queries";
import { useApiErrorMessage } from "@/lib/error-messages";
import { SectionTabs } from "@/components/links/edit-link-dialog/section-tabs";
import { BasicSection } from "@/components/links/edit-link-dialog/sections/basic-section";
import { OgOverrideSection } from "@/components/links/edit-link-dialog/sections/og-override-section";
import { ProtectionSection } from "@/components/links/edit-link-dialog/sections/protection-section";
import { TagsSection } from "@/components/links/edit-link-dialog/sections/tags-section";
import { blankToNull, toLocalInput, type Section } from "@/components/links/edit-link-dialog/utils";
import type { MyLink } from "@/types";

type Props = {
  link: MyLink | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Modal dialog for editing a link's metadata. Drives four sub-sections (basic / tags / OG override
 * / protection) and saves them in a single submit, calling each backend endpoint only when its
 * slice actually changed. Each sub-section is a pure presentational component — all state +
 * change-detection is owned here.
 */
export function EditLinkDialog({ link, onClose, onSaved }: Props) {
  const t = useTranslations("edit");
  const errorMessage = useApiErrorMessage();
  const [section, setSection] = useState<Section>("basic");
  const [originalUrl, setOriginalUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [expiredMessage, setExpiredMessage] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [maxViewsInput, setMaxViewsInput] = useState("");
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
    setExpiresAt(link.expiresAt ? toLocalInput(link.expiresAt) : "");
    setOgTitle("");
    setOgDescription("");
    setOgImage("");
    setPassword("");
    setRemovePassword(false);
    setMaxViewsInput("");
    setTags(link.tags ?? []);
    setNote("");
    setExpiredMessage("");
    setError(null);
  }, [link]);

  // Overlay detail-only fields once the fetch lands.
  useEffect(() => {
    if (!detail) return;
    setOgTitle(detail.ogTitleOverride ?? "");
    setOgDescription(detail.ogDescriptionOverride ?? "");
    setOgImage(detail.ogImageOverride ?? "");
    setMaxViewsInput(detail.maxViews != null ? String(detail.maxViews) : "");
    setTags(detail.tags ?? []);
    setNote(detail.note ?? "");
    setExpiredMessage(detail.expiredMessage ?? "");
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
      await applyProtection();
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
    const beforeIso = link.expiresAt ?? null;
    const afterIso = expiresAt ? new Date(expiresAt).toISOString() : null;
    const expiresChanged = beforeIso !== afterIso;
    const noteChanged = (detail?.note ?? "") !== note;
    const expiredChanged = (detail?.expiredMessage ?? "") !== expiredMessage;
    if (!urlChanged && !expiresChanged && !noteChanged && !expiredChanged) return;
    await updateLink(link.shortCode, {
      originalUrl: urlChanged ? trimmed : undefined,
      expiresAt: expiresChanged ? afterIso : undefined,
      note: noteChanged ? note : undefined,
      expiredMessage: expiredChanged ? expiredMessage : undefined,
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

  async function applyProtection() {
    if (!link || !detail) return;
    const trimmedMax = maxViewsInput.trim();
    let nextMaxViews: number | null;
    if (!trimmedMax) {
      nextMaxViews = null;
    } else {
      const parsed = Number(trimmedMax);
      if (!Number.isFinite(parsed) || parsed < 1 || !Number.isInteger(parsed)) {
        throw new Error(t("protection.maxViewsInvalid"));
      }
      nextMaxViews = parsed;
    }
    const passwordChanged = password.length > 0 || removePassword;
    const maxViewsChanged = nextMaxViews !== detail.maxViews;
    if (!passwordChanged && !maxViewsChanged) return;
    const passwordPayload = removePassword ? "" : password.length > 0 ? password : null;
    await setLinkProtection(link.shortCode, {
      password: passwordPayload,
      maxViews: nextMaxViews,
    });
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
            expiresAt={expiresAt}
            note={note}
            expiredMessage={expiredMessage}
            busy={busy}
            loadingDetail={loadingDetail}
            onOriginalUrlChange={setOriginalUrl}
            onExpiresAtChange={setExpiresAt}
            onNoteChange={setNote}
            onExpiredMessageChange={setExpiredMessage}
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
        {section === "protection" && (
          <ProtectionSection
            password={password}
            removePassword={removePassword}
            passwordProtected={Boolean(detail?.passwordProtected)}
            maxViewsInput={maxViewsInput}
            viewCount={detail?.viewCount ?? 0}
            maxViews={detail?.maxViews ?? null}
            busy={busy}
            loadingDetail={loadingDetail}
            onPasswordChange={setPassword}
            onRemovePasswordChange={setRemovePassword}
            onMaxViewsChange={setMaxViewsInput}
            t={t}
          />
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
    </ConfirmDialog>
  );
}
