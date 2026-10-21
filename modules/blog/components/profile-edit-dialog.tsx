"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { AvatarTooBigError, uploadAvatar, useAvatarPick } from "@/components/settings/avatar-picker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/use-confirm";
import { useNarrowViewport } from "@/hooks/use-narrow-viewport";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/blog/components/avatar";
import { followToggleClass } from "@/modules/blog/lib/follow-toggle";
import { usePublishOwnProfile } from "@/modules/blog/lib/own-profile";
import { deleteAvatar, getMyProfile, updateMyProfile } from "@/modules/profile/api/profile";
import type { MyProfile } from "@/types";

const NAME_MAX = 30;
const BIO_MAX = 280;

type Photo = { kind: "keep" } | { kind: "new"; file: File; url: string } | { kind: "delete" };

const FIELD =
  "focus-ring mt-1.5 block w-full rounded-surface border border-slate-300 bg-white px-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export function ProfileEditButton({ username }: { username: string }) {
  const t = useTranslations("profileEdit");
  const { ready, me } = useAuth();
  const [open, setOpen] = useState(false);
  if (!ready || me?.username !== username) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={followToggleClass(true)}>
        {t("title")}
      </button>
      <ProfileEditDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ProfileEditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("profileEdit");
  const tAvatar = useTranslations("avatar");
  const tCommon = useTranslations("common");
  const narrow = useNarrowViewport();
  const { me } = useAuth();
  const publish = usePublishOwnProfile();
  const errorMessage = useApiErrorMessage();
  const [confirm, confirmDialog] = useConfirm({ layerClassName: "z-[60]" });
  const nameId = useId();
  const nameHintId = useId();
  const bioId = useId();
  const bioCountId = useId();

  const [attempt, setAttempt] = useState(0);
  const [initial, setInitial] = useState<MyProfile | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<Photo>({ kind: "keep" });
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saved = useRef(false);

  const { pick, elements: pickerElements } = useAvatarPick({
    onInvalid: setPhotoError,
    onCropped: (file) => {
      setPhotoError(null);
      setPhoto({ kind: "new", file, url: URL.createObjectURL(file) });
    },
  });

  useEffect(() => {
    if (photo.kind !== "new") return;
    const url = photo.url;
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    saved.current = false;
    setInitial(null);
    setLoadFailed(false);
    setPhoto({ kind: "keep" });
    setPhotoError(null);
    setSaveError(null);
    getMyProfile()
      .then((profile) => {
        if (!alive) return;
        setInitial(profile);
        setName(profile.displayName ?? "");
        setBio(profile.bio ?? "");
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [open, attempt]);

  const dirty =
    initial !== null &&
    (name !== (initial.displayName ?? "") || bio !== (initial.bio ?? "") || photo.kind !== "keep");
  const bioTooLong = bio.length > BIO_MAX;
  const canSave = dirty && !bioTooLong && !busy;
  const shownPhoto = photo.kind === "new" ? photo.url : photo.kind === "delete" ? null : (initial?.avatarUrl ?? null);

  async function requestClose() {
    if (busy) return;
    if (saved.current || !dirty) {
      onClose();
      return;
    }
    const discard = await confirm({
      title: t("discardTitle"),
      confirmLabel: t("discard"),
      cancelLabel: t("keepEditing"),
      destructive: true,
    });
    if (discard) onClose();
  }

  async function save() {
    if (!initial || !canSave) return;
    setBusy(true);
    setPhotoError(null);
    setSaveError(null);
    let next = initial;
    const patch: { displayName?: string; bio?: string } = {};
    if (name.trim() !== (initial.displayName ?? "")) patch.displayName = name.trim();
    if (bio.trim() !== (initial.bio ?? "")) patch.bio = bio.trim();
    try {
      if (patch.displayName !== undefined || patch.bio !== undefined) next = await updateMyProfile(patch);
    } catch (err) {
      setSaveError(errorMessage(err, t("saveFailed")));
      setBusy(false);
      throw err;
    }
    try {
      if (photo.kind === "new") next = { ...next, avatarUrl: await uploadAvatar(photo.file) };
      if (photo.kind === "delete") {
        await deleteAvatar();
        next = { ...next, avatarUrl: null };
      }
    } catch (err) {
      publish(next);
      setInitial(next);
      setName(next.displayName ?? "");
      setBio(next.bio ?? "");
      setPhotoError(err instanceof AvatarTooBigError ? tAvatar("tooBig") : errorMessage(err, tAvatar("uploadFailed")));
      setBusy(false);
      throw err;
    }
    publish(next);
    saved.current = true;
    setBusy(false);
  }

  function removePhoto() {
    setPhotoError(null);
    setPhoto(initial?.avatarUrl ? { kind: "delete" } : { kind: "keep" });
  }

  const fieldsDisabled = initial === null || busy;

  const body = loadFailed ? (
    <div className="flex items-center gap-3 py-2 text-sm text-slate-600 dark:text-slate-300">
      <p>{t("loadFailed")}</p>
      <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
        {tCommon("retry")}
      </Button>
    </div>
  ) : (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar
          src={shownPhoto}
          name={name.trim() || me?.username || "?"}
          handle={me?.username}
          size="xl"
          eager
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={pick} disabled={fieldsDisabled}>
              {shownPhoto ? t("photoChange") : t("photoAdd")}
            </Button>
            {shownPhoto && (
              <Button variant="ghost" size="sm" onClick={removePhoto} disabled={fieldsDisabled}>
                {tAvatar("remove")}
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{tAvatar("hint")}</p>
          {photoError && (
            <p role="alert" className="mt-1 text-[13px] text-red-600 dark:text-red-400">
              {photoError}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={nameId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {t("nameLabel")}
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder={t("namePlaceholder")}
          aria-describedby={nameHintId}
          autoComplete="nickname"
          disabled={fieldsDisabled}
          className={FIELD}
        />
        <p id={nameHintId} className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          {t("nameHint")}
        </p>
      </div>

      <div>
        <label htmlFor={bioId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {t("bioLabel")}
        </label>
        <textarea
          id={bioId}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          aria-describedby={bioCountId}
          aria-invalid={bioTooLong || undefined}
          disabled={fieldsDisabled}
          className={cn(FIELD, "min-h-[4.5lh] max-h-[40vh] resize-none leading-relaxed [field-sizing:content]")}
        />
        <p
          id={bioCountId}
          className={cn(
            "mt-1 text-right text-[12px] tabular-nums",
            bioTooLong ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
          )}
        >
          {bio.length} / {BIO_MAX}
        </p>
      </div>

      {saveError && (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}
    </div>
  );

  return (
    <>
      {narrow ? (
        <BottomSheet open={open} onClose={() => void requestClose()} label={t("title")}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
          <div className="mt-4">{body}</div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void requestClose()} disabled={busy}>
              {tCommon("cancel")}
            </Button>
            <Button
              disabled={!canSave}
              onClick={() =>
                save().then(
                  () => onClose(),
                  () => undefined,
                )
              }
            >
              {busy ? t("saving") : t("save")}
            </Button>
          </div>
        </BottomSheet>
      ) : (
        <ConfirmDialog
          open={open}
          onOpenChange={(next) => {
            if (!next) void requestClose();
          }}
          title={t("title")}
          confirmLabel={t("save")}
          busyLabel={t("saving")}
          confirmDisabled={!canSave}
          onConfirm={save}
          compact
        >
          {body}
        </ConfirmDialog>
      )}
      {pickerElements}
      {confirmDialog}
    </>
  );
}
