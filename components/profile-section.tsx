"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Minus,
  Pencil,
  Star,
  Type,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  createProfileBlock,
  deleteProfileBlock,
  getMyProfile,
  listMyLinks,
  reorderProfileItems,
  setLinkHighlight,
  toggleLinkOnProfile,
  updateMyProfile,
  updateProfileBlock,
} from "@/lib/api";
import type { MyLink, MyProfile, ProfileReorderItem, ProfileTheme } from "@/types";

type FeedItem =
  | { kind: "LINK"; code: string }
  | { kind: "BLOCK"; id: number; type: "TEXT" | "DIVIDER" | "IMAGE"; content: string | null };
import { ProfileQuickAdd } from "./profile-quick-add";
import { QrButton } from "./qr-button";

const THEMES: { id: ProfileTheme; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#F8FAFC" },
  { id: "dark", label: "Dark", swatch: "#0F172A" },
  { id: "accent", label: "Accent", swatch: "#0EA5E9" },
];

export type ProfileDraft = {
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  featured: string[];
  links: MyLink[];
};

type ProfileSectionProps = {
  /** Fires on every local change so a parent can render a live preview alongside. */
  onDraft?: (draft: ProfileDraft) => void;
};

export function ProfileSection({ onDraft }: ProfileSectionProps = {}) {
  const t = useTranslations("settings.profile");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<ProfileTheme | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [links, setLinks] = useState<MyLink[] | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [highlightedShortCode, setHighlightedShortCode] = useState<string | null>(null);
  const [pendingShortCode, setPendingShortCode] = useState<string | null>(null);
  const featured = items.filter((i): i is { kind: "LINK"; code: string } => i.kind === "LINK")
    .map((i) => i.code);

  // Bubble local edit state up to the parent on every change so a preview pane can update live
  // without round-tripping. Saved profile state stays separate — the draft IS the source of truth
  // for what visitors will see post-save.
  useEffect(() => {
    onDraft?.({ username, bio, theme, featured, links: links ?? [] });
  }, [username, bio, theme, featured, links, onDraft]);

  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedRef = useRef<{ bio: string; theme: ProfileTheme | null } | null>(null);

  // After the username is claimed, bio + theme silently auto-save 600ms after the last change.
  // Username keeps its explicit Save button because it's immutable once set — we want intent for
  // that, but everything else should "just save" so the editor feels alive.
  useEffect(() => {
    if (!profile?.username) return;
    if (lastSavedRef.current === null) {
      lastSavedRef.current = { bio: profile.bio ?? "", theme: profile.theme ?? null };
      return;
    }
    if (lastSavedRef.current.bio === bio && lastSavedRef.current.theme === theme) return;
    setAutoSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const updated = await updateMyProfile({
          bio: bio.trim(),
          theme: theme ?? undefined,
        });
        setProfile(updated);
        lastSavedRef.current = { bio, theme };
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch (err) {
        toast(errorMessage(err, t("saveFailed")), "error");
        setAutoSaveStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [bio, theme, profile?.username, profile?.bio, profile?.theme, errorMessage, t, toast]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), listMyLinks({ page: 1, size: 100 })])
      .then(([prof, page]) => {
        if (cancelled) return;
        setProfile(prof);
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setTheme(prof.theme ?? null);
        setLinks(page.items);
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // The bare profile fetch doesn't carry order or block state, so we hit the public endpoint
  // once a username exists to seed the unified items list. Future toggle/reorder/block calls
  // keep the local list authoritative — no need to refetch.
  useEffect(() => {
    if (!profile?.username) {
      setItems([]);
      return;
    }
    let cancelled = false;
    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/v1/public/profiles/${encodeURIComponent(
        profile.username,
      )}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const entries = (data.entries ?? []) as Array<{
          kind: "LINK" | "TEXT" | "DIVIDER" | "IMAGE";
          id: number | null;
          shortCode: string | null;
          highlighted?: boolean | null;
          content?: string | null;
        }>;
        const next: FeedItem[] = [];
        for (const e of entries) {
          if (e.kind === "LINK" && e.shortCode) {
            next.push({ kind: "LINK", code: e.shortCode });
          } else if (e.kind === "TEXT" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "TEXT", content: e.content ?? "" });
          } else if (e.kind === "DIVIDER" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "DIVIDER", content: null });
          } else if (e.kind === "IMAGE" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "IMAGE", content: e.content ?? "" });
          }
        }
        setItems(next);
        const hl = entries.find((e) => e.kind === "LINK" && e.highlighted);
        setHighlightedShortCode(hl?.shortCode ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.username, reload]);

  async function handleSaveProfile() {
    const next = username.trim().toLowerCase();
    const prev = (profile?.username ?? "").toLowerCase();
    // Username changes give up the previous handle into a 30d grace window — make the user
    // ack that explicitly so they don't accidentally lose the link they put in their bio.
    if (prev && next && prev !== next) {
      const ok = window.confirm(t("usernameChangeConfirm", { prev, next }));
      if (!ok) return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        username: next || undefined,
        bio: bio.trim(),
        theme: theme ?? undefined,
      });
      setProfile(updated);
      toast(t("saved"), "success");
    } catch (err) {
      toast(errorMessage(err, t("saveFailed")), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleHighlight(shortCode: string) {
    const wasHighlighted = highlightedShortCode === shortCode;
    const next = wasHighlighted ? null : shortCode;
    setHighlightedShortCode(next);
    try {
      await setLinkHighlight(shortCode, !wasHighlighted);
    } catch (err) {
      setHighlightedShortCode(highlightedShortCode);
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  function toReorderTokens(arr: FeedItem[]): ProfileReorderItem[] {
    return arr.map((it) =>
      it.kind === "LINK"
        ? { kind: "LINK", id: it.code }
        : { kind: "BLOCK", id: String(it.id) },
    );
  }

  async function handleToggle(shortCode: string, show: boolean) {
    setPendingShortCode(shortCode);
    try {
      await toggleLinkOnProfile(shortCode, show);
      const nextItems: FeedItem[] = show
        ? [...items.filter((i) => !(i.kind === "LINK" && i.code === shortCode)), {
            kind: "LINK",
            code: shortCode,
          }]
        : items.filter((i) => !(i.kind === "LINK" && i.code === shortCode));
      setItems(nextItems);
      // Toggling-on appends to the end and the server already assigned a fresh order, so we
      // don't need to call reorder. Toggling-off just removes; remaining items keep their order.
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    } finally {
      setPendingShortCode(null);
    }
  }

  async function move(itemIdx: number, direction: -1 | 1) {
    const swap = itemIdx + direction;
    if (swap < 0 || swap >= items.length) return;
    const next = items.slice();
    [next[itemIdx], next[swap]] = [next[swap], next[itemIdx]];
    void commitOrder(next);
  }

  // HTML5 drag-and-drop state. dragIndex = the row currently being dragged; overIndex = the row
  // we'd drop into. Two-phase render so the dragged row gets a faded look and the target shows
  // a leading drop indicator. Persists via reorderProfileItems on drop, with optimistic UI.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  async function commitOrder(next: FeedItem[]) {
    const prev = items;
    setItems(next);
    try {
      await reorderProfileItems(toReorderTokens(next));
    } catch (err) {
      setItems(prev);
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = items.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    void commitOrder(next);
  }

  async function handleAddText() {
    const content = window.prompt(t("addTextPrompt"), "");
    if (!content || !content.trim()) return;
    try {
      const block = await createProfileBlock({ type: "TEXT", content: content.trim() });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type: "TEXT", content: block.content ?? "" },
      ]);
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function handleAddDivider() {
    try {
      const block = await createProfileBlock({ type: "DIVIDER" });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type: "DIVIDER", content: null },
      ]);
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function handleAddImage() {
    const url = window.prompt(t("addImagePrompt"), "https://");
    if (!url || !url.trim()) return;
    try {
      const block = await createProfileBlock({ type: "IMAGE", content: url.trim() });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type: "IMAGE", content: block.content ?? "" },
      ]);
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function handleEditBlock(blockId: number, current: string) {
    const item = items.find((i) => i.kind === "BLOCK" && i.id === blockId);
    const isImage = item?.kind === "BLOCK" && item.type === "IMAGE";
    const next = window.prompt(isImage ? t("editImagePrompt") : t("editTextPrompt"), current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    try {
      const updated = await updateProfileBlock(blockId, trimmed);
      setItems((prev) =>
        prev.map((i) =>
          i.kind === "BLOCK" && i.id === blockId
            ? { ...i, content: updated.content ?? "" }
            : i,
        ),
      );
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function handleDeleteBlock(blockId: number) {
    try {
      await deleteProfileBlock(blockId);
      setItems((prev) => prev.filter((i) => !(i.kind === "BLOCK" && i.id === blockId)));
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  const otherLinks = (links ?? []).filter((l) => !featured.includes(l.shortCode));

  const profileInfoBlock = (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">{t("usernameLabel")}</span>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="haroya"
          pattern="^[a-z0-9][a-z0-9_]{2,15}$"
          maxLength={16}
        />
        <p className="text-[11px] text-slate-400">
          {profile?.username ? t("usernameChangeHint") : t("usernameHint")}
        </p>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">{t("bioLabel")}</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder={t("bioPlaceholder")}
          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        />
        <p className="text-[11px] text-slate-400">{bio.length}/280</p>
      </label>

      <div className="space-y-1">
        <span className="text-xs font-medium text-slate-500">{t("themeLabel")}</span>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map((tm) => {
            const active = theme === tm.id;
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => setTheme(tm.id)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                  (active
                    ? "border-accent-300 bg-accent-50 text-accent-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                }
              >
                <span
                  className="h-3 w-3 rounded-full border border-slate-200"
                  style={{ backgroundColor: tm.swatch }}
                />
                {tm.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!profile?.username && (
          <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
            {t("claim")}
          </Button>
        )}
        {profile?.username &&
          username.trim().toLowerCase() !== profile.username.toLowerCase() && (
            <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm">
              {t("usernameChangeAction")}
            </Button>
          )}
        {profile?.username &&
          username.trim().toLowerCase() === profile.username.toLowerCase() && (
            <span className="text-[11px] text-slate-400">
              {autoSaveStatus === "saving"
                ? t("autosaving")
                : autoSaveStatus === "saved"
                  ? t("autosaved")
                  : t("autosaveHint")}
            </span>
          )}
        {profile?.publicUrl && (
          <div className="flex items-center gap-2">
            <PublicUrlPill url={profile.publicUrl} t={t} />
            <QrButton
              url={profile.publicUrl}
              filename={`${profile.username}.png`}
              logoSrc="/icon.svg"
            />
          </div>
        )}
      </div>
    </div>
  );

  // No username yet → just show the claim flow.
  if (!profile?.username) {
    return (
      <div className="space-y-5">
        <p className="text-xs text-slate-500">{t("intro")}</p>
        {profileInfoBlock}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileQuickAdd onAdded={refresh} highlightEmpty={items.length === 0} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-slate-700">{t("featuredTitle")}</p>
            <p className="text-[11px] text-slate-500">{t("featuredHint")}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddText}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300"
            >
              <Type className="h-3 w-3" />
              {t("addHeader")}
            </button>
            <button
              type="button"
              onClick={handleAddDivider}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300"
            >
              <Minus className="h-3 w-3" />
              {t("addDivider")}
            </button>
            <button
              type="button"
              onClick={handleAddImage}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300"
            >
              <ImageIcon className="h-3 w-3" />
              {t("addImage")}
            </button>
          </div>
        </div>
          {links === null ? (
            <p className="text-xs text-slate-400">{t("loading")}</p>
          ) : (
            <>
              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50/40 p-3 text-center text-[11px] text-slate-500">
                  {t("featuredEmpty")}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                  {items.map((item, idx) => {
                    const isDragging = dragIndex === idx;
                    const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
                    const rowKey =
                      item.kind === "LINK" ? `link:${item.code}` : `block:${item.id}`;
                    const dragHandle = (
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-label="drag handle"
                          className="cursor-grab touch-none text-slate-300 hover:text-slate-700 active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col sm:hidden">
                          <button
                            type="button"
                            aria-label="up"
                            disabled={idx === 0}
                            onClick={() => move(idx, -1)}
                            className="text-slate-400 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="down"
                            disabled={idx === items.length - 1}
                            onClick={() => move(idx, 1)}
                            className="text-slate-400 hover:text-slate-900 disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                    const dndProps = {
                      draggable: true,
                      onDragStart: (e: React.DragEvent) => {
                        setDragIndex(idx);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", rowKey);
                      },
                      onDragOver: (e: React.DragEvent) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (overIndex !== idx) setOverIndex(idx);
                      },
                      onDragLeave: () => {
                        if (overIndex === idx) setOverIndex(null);
                      },
                      onDrop: (e: React.DragEvent) => {
                        e.preventDefault();
                        handleDrop(idx);
                      },
                      onDragEnd: () => {
                        setDragIndex(null);
                        setOverIndex(null);
                      },
                    };
                    const baseRow =
                      "flex items-center justify-between gap-3 px-3 py-2 transition " +
                      (isDragging ? "opacity-40 " : "") +
                      (isOver ? "border-t-2 border-t-accent-500 " : "");
                    if (item.kind === "BLOCK" && item.type === "DIVIDER") {
                      return (
                        <li key={rowKey} {...dndProps} className={baseRow}>
                          {dragHandle}
                          <div className="flex min-w-0 flex-1 items-center gap-2 text-slate-400">
                            <Minus className="h-3.5 w-3.5" />
                            <span className="text-[11px]">{t("dividerLabel")}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(item.id)}
                            className="text-slate-400 hover:text-red-600"
                            aria-label={t("remove")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    }
                    if (item.kind === "BLOCK" && item.type === "IMAGE") {
                      return (
                        <li key={rowKey} {...dndProps} className={baseRow}>
                          {dragHandle}
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {item.content ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.content}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate text-[11px] text-slate-500">
                              {item.content || t("addImagePlaceholder")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditBlock(item.id, item.content ?? "")}
                              className="text-slate-400 hover:text-slate-900"
                              aria-label={t("editTextAction")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(item.id)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label={t("remove")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    }
                    if (item.kind === "BLOCK" && item.type === "TEXT") {
                      return (
                        <li key={rowKey} {...dndProps} className={baseRow}>
                          {dragHandle}
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Type className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {item.content || t("addTextPlaceholder")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditBlock(item.id, item.content ?? "")}
                              className="text-slate-400 hover:text-slate-900"
                              aria-label={t("editTextAction")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBlock(item.id)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label={t("remove")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    }
                    // LINK row
                    if (item.kind !== "LINK") return null;
                    const link = links?.find((l) => l.shortCode === item.code);
                    if (!link) return null;
                    return (
                      <li key={rowKey} {...dndProps} className={baseRow}>
                        {dragHandle}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-sm text-slate-900">
                            /{link.shortCode}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleHighlight(link.shortCode)}
                            aria-pressed={highlightedShortCode === link.shortCode}
                            title={t("highlight")}
                            className={
                              "transition " +
                              (highlightedShortCode === link.shortCode
                                ? "text-amber-500"
                                : "text-slate-300 hover:text-slate-700")
                            }
                          >
                            <Star
                              className="h-3.5 w-3.5"
                              fill={
                                highlightedShortCode === link.shortCode
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(link.shortCode, false)}
                            disabled={pendingShortCode === link.shortCode}
                            className="text-[11px] text-slate-500 hover:text-red-600"
                          >
                            {t("remove")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {otherLinks.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-900">
                    {t("addMore")} ({otherLinks.length})
                  </summary>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                    {otherLinks.map((link) => (
                      <li
                        key={link.shortCode}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-slate-900">/{link.shortCode}</p>
                          <p className="truncate text-[11px] text-slate-500">{link.originalUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(link.shortCode, true)}
                          disabled={pendingShortCode === link.shortCode}
                          className="text-[11px] text-accent-700 hover:text-accent-800"
                        >
                          {t("add")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
      </div>

      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {t("profileInfoToggle")}
        </summary>
        <div className="border-t border-slate-100 p-4">{profileInfoBlock}</div>
      </details>
    </div>
  );
}

function PublicUrlPill({
  url,
  t,
}: {
  url: string;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently no-op */
    }
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
      >
        <ExternalLink className="h-3 w-3" />
        {url.replace(/^https?:\/\//, "")}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={t("copyPublicUrl")}
        title={t("copyPublicUrl")}
        className="text-slate-400 hover:text-slate-700"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
}
