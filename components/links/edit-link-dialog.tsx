"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  getLinkDetail,
  isValidUrl,
  listTags,
  setLinkOgOverride,
  setLinkProtection,
  setLinkTags,
  updateLink,
} from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { SectionTabs } from "@/components/links/edit-link-dialog/section-tabs";
import { BasicSection } from "@/components/links/edit-link-dialog/sections/basic-section";
import { OgOverrideSection } from "@/components/links/edit-link-dialog/sections/og-override-section";
import { ProtectionSection } from "@/components/links/edit-link-dialog/sections/protection-section";
import { TagsSection } from "@/components/links/edit-link-dialog/sections/tags-section";
import { blankToNull, toLocalInput, type Section } from "@/components/links/edit-link-dialog/utils";
import type { LinkDetail, MyLink } from "@/types";

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
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [detail, setDetail] = useState<LinkDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    setTagSuggestions([]);
    setDetail(null);
    setError(null);
    let cancelled = false;
    setLoadingDetail(true);
    Promise.all([getLinkDetail(link.shortCode), listTags().catch(() => [])])
      .then(([d, allTags]) => {
        if (cancelled) return;
        setDetail(d);
        setOgTitle(d.ogTitleOverride ?? "");
        setOgDescription(d.ogDescriptionOverride ?? "");
        setOgImage(d.ogImageOverride ?? "");
        setMaxViewsInput(d.maxViews != null ? String(d.maxViews) : "");
        setTags(d.tags ?? []);
        setTagSuggestions(allTags.map((t) => t.name));
        setNote(d.note ?? "");
        setExpiredMessage(d.expiredMessage ?? "");
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  useEffect(() => {
    if (!link) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [link, busy, onClose]);

  const ogPlaceholders = useMemo(
    () => ({
      title: detail?.ogTitle ?? "",
      description: detail?.ogDescription ?? "",
      image: detail?.ogImage ?? "",
    }),
    [detail],
  );

  if (!link) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!link) return;
    if (originalUrl.trim() && !isValidUrl(originalUrl.trim())) {
      setError(t("invalidUrl"));
      return;
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
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && onClose()} />
      <form
        onSubmit={handleSave}
        className="relative w-full max-w-md animate-fade-in rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
          <span className="font-mono text-xs text-slate-500">/{link.shortCode}</span>
        </div>

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
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="accent" disabled={busy || loadingDetail}>
            {busy ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
