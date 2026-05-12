"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  createProfileBlock,
  deleteProfileBlock,
  getMyProfile,
  listMyLinks,
  reorderProfileItems,
  setLinkHighlight,
  setLinkOgOverride,
  toggleLinkOnProfile,
  updateMyProfile,
  updateProfileBlock,
} from "@/lib/api";
import type {
  MyLink,
  MyProfile,
  ProfileReorderItem,
  ProfileTheme,
  PublicProfileEntry,
  Social,
} from "@/types";
import { BookingBlockDialog } from "./profile-section/BookingBlockDialog";
import { ContactCardBlockDialog } from "./profile-section/ContactCardBlockDialog";
import { EmailFormBlockDialog } from "./profile-section/EmailFormBlockDialog";
import { EmbedBlockDialog } from "./profile-section/EmbedBlockDialog";
import { TextBlockDialog } from "./profile-section/TextBlockDialog";
import { EventBlockDialog } from "./profile-section/EventBlockDialog";
import { PlaceBlockDialog } from "./profile-section/PlaceBlockDialog";
import { GalleryBlockDialog } from "./profile-section/GalleryBlockDialog";
import { ImageBlockDialog } from "./profile-section/ImageBlockDialog";
import { ProductCardBlockDialog } from "./profile-section/ProductCardBlockDialog";
import { ProfileFeedEditor } from "./profile-section/ProfileFeedEditor";
import { ProfileMetaForm } from "./profile-section/ProfileMetaForm";
import { useBlockDialog } from "./profile-section/use-block-dialog";
import { socialUrlPrefix } from "./profile-section/socials-templates";
import type { FeedItem } from "./profile-section/types";
import { ProfileQuickAdd } from "./profile-quick-add";

export type ProfileDraft = {
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: Social[];
  /**
   * The exact shape the public profile receives from the API, synthesized from the editor's local
   * state (items + links + per-link meta + highlight flag). Letting the preview render the same
   * {@link EntryList} this way means the highlighted hero / image / YouTube variants never drift.
   */
  entries: PublicProfileEntry[];
};

type ProfileSectionProps = {
  /** Fires on every local change so a parent can render a live preview alongside. */
  onDraft?: (draft: ProfileDraft) => void;
};

/**
 * Stateful orchestrator for the profile editor. Owns the network state (profile / links / items),
 * handlers (save / toggle / reorder / block CRUD), and HTML5 drag-and-drop indices. The two child
 * components ({@link ProfileMetaForm} and {@link ProfileFeedEditor}) are pure render — every
 * mutation routes back through props so the optimistic state stays in one place.
 */
export function ProfileSection({ onDraft }: ProfileSectionProps = {}) {
  const t = useTranslations("settings.profile");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<ProfileTheme | null>(null);
  const [socials, setSocials] = useState<Social[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [links, setLinks] = useState<MyLink[] | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [labelByShortCode, setLabelByShortCode] = useState<Record<string, string>>({});
  // OG image per featured link — captured on the initial public-profile fetch so the preview can
  // render the highlighted "hero card" variant identically. New links the user just added won't
  // have an entry here until the next refresh; the card silently falls back to the generic
  // variant, which is the same behavior the live page exhibits before the OG scrape lands.
  const [ogImageByShortCode, setOgImageByShortCode] = useState<Record<string, string>>({});
  const [highlightedShortCode, setHighlightedShortCode] = useState<string | null>(null);
  const [pendingShortCode, setPendingShortCode] = useState<string | null>(null);
  // Ten block-editor dialogs sharing the same {open, blockId, initialPayload} shape — each block
  // type opens its own dialog component (forms are very different: 7-field contact card vs URL
  // list vs markdown). `useBlockDialog` collapses 50+ lines of identical useState boilerplate to
  // one line each + gives them a uniform `show()` / `close()` surface.
  const contactCardDialog = useBlockDialog<string>(); // initial JSON
  const galleryDialog = useBlockDialog<string>();
  const productCardDialog = useBlockDialog<string>();
  const emailFormDialog = useBlockDialog<string>();
  const bookingDialog = useBlockDialog<string>();
  const eventDialog = useBlockDialog<string>();
  const placeDialog = useBlockDialog<string>();
  const imageDialog = useBlockDialog<string>(); // initial URL
  const embedDialog = useBlockDialog<string>();
  const textDialog = useBlockDialog<string>(); // initial markdown content
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedRef = useRef<{
    bio: string;
    theme: ProfileTheme | null;
    socials: string;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Build the same {@link PublicProfileEntry} shape the public profile endpoint returns from local
  // editor state. The preview consumes this directly through the real {@link EntryList} component,
  // so a highlighted link with an OG image renders as the hero card, image-URL destinations render
  // inline, YouTube gets the play-overlay thumbnail, etc. — no parallel rendering logic.
  //
  // Memoized so the array reference is stable across renders where the inputs didn't change —
  // otherwise the parent's `onDraft` useEffect (deps include `entries`) fires every render, the
  // parent calls setDraft, ProfileSection re-renders, entries is a new ref again → infinite loop
  // that React surfaces as "Maximum update depth exceeded" and detaches event handlers, making
  // the whole page unresponsive (logo / language switcher click 시 무반응 증상).
  const entries: PublicProfileEntry[] = useMemo(
    () =>
      items
        .map((it): PublicProfileEntry | null => {
      if (it.kind === "LINK") {
        const link = (links ?? []).find((l) => l.shortCode === it.code);
        if (!link) return null;
        return {
          kind: "LINK",
          id: null,
          shortCode: link.shortCode,
          shortUrl: link.shortUrl,
          originalUrl: link.originalUrl,
          ogTitle: labelByShortCode[link.shortCode] ?? null,
          ogImage: ogImageByShortCode[link.shortCode] ?? null,
          clickCount: link.clickCount ?? null,
          highlighted: highlightedShortCode === link.shortCode,
          content: null,
        };
      }
      return {
        kind: it.type,
        id: it.id,
        shortCode: null,
        shortUrl: null,
        originalUrl: null,
        ogTitle: null,
        ogImage: null,
        clickCount: null,
        highlighted: null,
        content: it.content,
      };
    })
    .filter((e): e is PublicProfileEntry => e !== null),
    [items, links, labelByShortCode, ogImageByShortCode, highlightedShortCode],
  );

  // Bubble local edit state up to the parent on every change so a preview pane can update live
  // without round-tripping. Saved profile state stays separate — the draft IS the source of truth
  // for what visitors will see post-save.
  useEffect(() => {
    onDraft?.({
      username,
      bio,
      theme,
      avatarUrl: profile?.avatarUrl ?? null,
      bannerUrl: profile?.bannerUrl ?? null,
      socials,
      entries,
    });
  }, [
    username,
    bio,
    theme,
    profile?.avatarUrl,
    profile?.bannerUrl,
    socials,
    entries,
    onDraft,
  ]);

  // After the username is claimed, bio + theme silently auto-save 600ms after the last change.
  // Username keeps its explicit Save button because changing it costs the user their old URL —
  // we want intent for that, but everything else should "just save" so the editor feels alive.
  useEffect(() => {
    if (!profile?.username) return;
    // Drop entries with empty URL so the user can leave a chip enabled while still drafting the
    // URL — only complete pairs trigger a save. Empty string later signals "clear all" to the API.
    // Drafting-aware filter: blank URLs OR "just the channel prefix" (https://x.com/ etc — left
    // after the chip prefill but before the user typed their handle) both count as in-progress.
    // We don't push them so a half-completed chip doesn't ship a useless URL to the public profile.
    const socialsCleaned = socials.filter((s) => {
      const url = s.url.trim();
      if (url.length === 0) return false;
      if (url === socialUrlPrefix(s.channel)) return false;
      return true;
    });
    const socialsJson = socialsCleaned.length === 0 ? "" : JSON.stringify(socialsCleaned);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = {
        bio: profile.bio ?? "",
        theme: profile.theme ?? null,
        socials: (profile.socials ?? []).length === 0 ? "" : JSON.stringify(profile.socials),
      };
      return;
    }
    if (
      lastSavedRef.current.bio === bio &&
      lastSavedRef.current.theme === theme &&
      lastSavedRef.current.socials === socialsJson
    )
      return;
    setAutoSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        const updated = await updateMyProfile({
          bio: bio.trim(),
          theme: theme ?? undefined,
          socials: socialsJson,
        });
        setProfile(updated);
        lastSavedRef.current = { bio, theme, socials: socialsJson };
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch (err) {
        toast(errorMessage(err, t("saveFailed")), "error");
        setAutoSaveStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [
    bio,
    theme,
    socials,
    profile?.username,
    profile?.bio,
    profile?.theme,
    profile?.socials,
    errorMessage,
    t,
    toast,
  ]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), listMyLinks({ size: 100 })])
      .then(([prof, page]) => {
        if (cancelled) return;
        setProfile(prof);
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setTheme(prof.theme ?? null);
        setSocials(prof.socials ?? []);
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
          kind:
            | "LINK"
            | "TEXT"
            | "DIVIDER"
            | "IMAGE"
            | "EMBED"
            | "EMAIL_FORM"
            | "CONTACT_CARD"
            | "GALLERY"
            | "PRODUCT_CARD"
            | "BOOKING"
            | "EVENT"
            | "PLACE";
          id: number | null;
          shortCode: string | null;
          ogTitle?: string | null;
          ogImage?: string | null;
          highlighted?: boolean | null;
          content?: string | null;
        }>;
        const next: FeedItem[] = [];
        const labels: Record<string, string> = {};
        const ogImages: Record<string, string> = {};
        for (const e of entries) {
          if (e.kind === "LINK" && e.shortCode) {
            next.push({ kind: "LINK", code: e.shortCode });
            if (e.ogTitle) labels[e.shortCode] = e.ogTitle;
            if (e.ogImage) ogImages[e.shortCode] = e.ogImage;
          } else if (e.kind === "TEXT" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "TEXT", content: e.content ?? "" });
          } else if (e.kind === "DIVIDER" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "DIVIDER", content: null });
          } else if (e.kind === "IMAGE" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "IMAGE", content: e.content ?? "" });
          } else if (e.kind === "EMBED" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "EMBED", content: e.content ?? "" });
          } else if (e.kind === "EMAIL_FORM" && e.id != null) {
            next.push({
              kind: "BLOCK",
              id: e.id,
              type: "EMAIL_FORM",
              content: e.content ?? "",
            });
          } else if (e.kind === "CONTACT_CARD" && e.id != null) {
            next.push({
              kind: "BLOCK",
              id: e.id,
              type: "CONTACT_CARD",
              content: e.content ?? "",
            });
          } else if (e.kind === "GALLERY" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "GALLERY", content: e.content ?? "" });
          } else if (e.kind === "PRODUCT_CARD" && e.id != null) {
            next.push({
              kind: "BLOCK",
              id: e.id,
              type: "PRODUCT_CARD",
              content: e.content ?? "",
            });
          } else if (e.kind === "BOOKING" && e.id != null) {
            next.push({
              kind: "BLOCK",
              id: e.id,
              type: "BOOKING",
              content: e.content ?? "",
            });
          } else if (e.kind === "EVENT" && e.id != null) {
            next.push({
              kind: "BLOCK",
              id: e.id,
              type: "EVENT",
              content: e.content ?? "",
            });
          }
        }
        setItems(next);
        setLabelByShortCode(labels);
        setOgImageByShortCode(ogImages);
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
    // Mirror the backend regex so non-ASCII (한글 등) / too short / illegal char inputs fail fast
    // with a proper toast instead of round-tripping into a generic 500 — backend remains the
    // source of truth, this is just early feedback.
    if (next && !/^[a-z0-9][a-z0-9_]{2,15}$/.test(next)) {
      toast(t("usernameInvalid"), "error");
      return;
    }
    // Username changes give up the previous handle into a 30d grace window — make the user
    // ack that explicitly so they don't accidentally lose the link they put in their bio.
    if (prev && next && prev !== next) {
      const ok = window.confirm(t("usernameChangeConfirm", { prev, next }));
      if (!ok) return;
    }
    setSavingProfile(true);
    try {
      const cleanedSocials = socials.filter((s) => {
        const url = s.url.trim();
        return url.length > 0 && url !== socialUrlPrefix(s.channel);
      });
      const updated = await updateMyProfile({
        username: next || undefined,
        bio: bio.trim(),
        theme: theme ?? undefined,
        socials: cleanedSocials.length === 0 ? "" : JSON.stringify(cleanedSocials),
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
        ? [
            ...items.filter((i) => !(i.kind === "LINK" && i.code === shortCode)),
            { kind: "LINK", code: shortCode },
          ]
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

  function handleDragStart(idx: number, e: React.DragEvent) {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers refuse to start the drag without a payload.
    const item = items[idx];
    e.dataTransfer.setData(
      "text/plain",
      item.kind === "LINK" ? `link:${item.code}` : `block:${item.id}`,
    );
  }

  function handleDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== idx) setOverIndex(idx);
  }

  function handleDrop(toIndex: number, e: React.DragEvent) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    // When the user drags a TEXT block, treat it as a section-level move: pick up the header
    // plus the contiguous run of non-TEXT rows that follow (up to the next TEXT or the end of
    // the list). This is how a "section" gets reordered as one unit instead of forcing the user
    // to drag each item individually. Non-TEXT rows fall back to the simple one-item splice.
    const dragged = items[dragIndex];
    const sectionEndExclusive =
      dragged.kind === "BLOCK" && dragged.type === "TEXT"
        ? findNextTextHeader(items, dragIndex + 1)
        : dragIndex + 1;
    // Drop targets that fall inside the source range are a no-op — moving a section onto itself
    // doesn't make sense and would otherwise produce a confusing splice.
    if (toIndex >= dragIndex && toIndex < sectionEndExclusive) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = items.slice();
    const moved = next.splice(dragIndex, sectionEndExclusive - dragIndex);
    // Account for the shift from removing items above the drop target.
    const adjustedTo = toIndex > dragIndex ? toIndex - moved.length : toIndex;
    next.splice(adjustedTo, 0, ...moved);
    setDragIndex(null);
    setOverIndex(null);
    void commitOrder(next);
  }

  /**
   * Returns the exclusive upper-bound index of the section that starts at {@code from} — i.e.
   * the index of the next TEXT block, or {@code items.length} if none follows. The caller uses
   * this to splice out the [header, ...children] range as one contiguous block.
   */
  function findNextTextHeader(arr: FeedItem[], from: number): number {
    for (let i = from; i < arr.length; i++) {
      const it = arr[i];
      if (it.kind === "BLOCK" && it.type === "TEXT") return i;
    }
    return arr.length;
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleAddText() {
    textDialog.show(null, null);
  }

  async function persistTextBlock(blockId: number | null, content: string) {
    try {
      if (blockId != null) {
        const updated = await updateProfileBlock(blockId, content);
        setItems((prev) =>
          prev.map((i) =>
            i.kind === "BLOCK" && i.id === blockId
              ? { ...i, content: updated.content ?? "" }
              : i,
          ),
        );
      } else {
        const block = await createProfileBlock({ type: "TEXT", content });
        setItems((prev) => [
          ...prev,
          { kind: "BLOCK", id: block.id, type: "TEXT", content: block.content ?? "" },
        ]);
      }
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

  function handleAddImage() {
    imageDialog.show(null, null);
  }

  async function persistImageBlock(blockId: number | null, url: string) {
    try {
      if (blockId != null) {
        const updated = await updateProfileBlock(blockId, url);
        setItems((prev) =>
          prev.map((i) =>
            i.kind === "BLOCK" && i.id === blockId
              ? { ...i, content: updated.content ?? "" }
              : i,
          ),
        );
      } else {
        const block = await createProfileBlock({ type: "IMAGE", content: url });
        setItems((prev) => [
          ...prev,
          { kind: "BLOCK", id: block.id, type: "IMAGE", content: block.content ?? "" },
        ]);
      }
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  function handleAddContactCard() {
    contactCardDialog.show(null, null);
  }

  function handleAddGallery() {
    galleryDialog.show(null, null);
  }

  function handleAddProductCard() {
    productCardDialog.show(null, null);
  }

  function handleAddEmailForm() {
    emailFormDialog.show(null, null);
  }

  function handleAddBooking() {
    bookingDialog.show(null, null);
  }

  function handleAddEvent() {
    eventDialog.show(null, null);
  }

  function handleAddPlace() {
    placeDialog.show(null, null);
  }

  async function persistJsonBlock(
    type: "CONTACT_CARD" | "GALLERY" | "PRODUCT_CARD" | "EMAIL_FORM" | "BOOKING" | "EVENT" | "PLACE",
    blockId: number | null,
    configJson: string,
  ) {
    try {
      if (blockId != null) {
        const updated = await updateProfileBlock(blockId, configJson);
        setItems((prev) =>
          prev.map((i) =>
            i.kind === "BLOCK" && i.id === blockId
              ? { ...i, content: updated.content ?? "" }
              : i,
          ),
        );
      } else {
        const block = await createProfileBlock({ type, content: configJson });
        setItems((prev) => [
          ...prev,
          { kind: "BLOCK", id: block.id, type, content: block.content ?? "" },
        ]);
      }
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  function handleAddEmbed() {
    embedDialog.show(null, null);
  }

  async function persistEmbedBlock(blockId: number | null, url: string) {
    try {
      if (blockId != null) {
        const updated = await updateProfileBlock(blockId, url);
        setItems((prev) =>
          prev.map((i) =>
            i.kind === "BLOCK" && i.id === blockId
              ? { ...i, content: updated.content ?? "" }
              : i,
          ),
        );
      } else {
        const block = await createProfileBlock({ type: "EMBED", content: url });
        setItems((prev) => [
          ...prev,
          { kind: "BLOCK", id: block.id, type: "EMBED", content: block.content ?? "" },
        ]);
      }
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function handleEditBlock(blockId: number, current: string) {
    const item = items.find((i) => i.kind === "BLOCK" && i.id === blockId);
    const blockType = item?.kind === "BLOCK" ? item.type : null;
    // CONTACT_CARD / GALLERY have multi-field configs stored as JSON — open their dedicated
    // dialogs instead of a single window.prompt where the user would face raw JSON.
    if (blockType === "CONTACT_CARD") {
      contactCardDialog.show(blockId, current);
      return;
    }
    if (blockType === "GALLERY") {
      galleryDialog.show(blockId, current);
      return;
    }
    if (blockType === "PRODUCT_CARD") {
      productCardDialog.show(blockId, current);
      return;
    }
    if (blockType === "EMAIL_FORM") {
      emailFormDialog.show(blockId, current);
      return;
    }
    if (blockType === "BOOKING") {
      bookingDialog.show(blockId, current);
      return;
    }
    if (blockType === "EVENT") {
      eventDialog.show(blockId, current);
      return;
    }
    if (blockType === "PLACE") {
      placeDialog.show(blockId, current);
      return;
    }
    if (blockType === "IMAGE") {
      imageDialog.show(blockId, current || null);
      return;
    }
    if (blockType === "EMBED") {
      embedDialog.show(blockId, current || null);
      return;
    }
    if (blockType === "TEXT") {
      textDialog.show(blockId, current || null);
      return;
    }
  }

  async function handleEditLabel(shortCode: string, label: string) {
    const trimmed = label.trim();
    const prev = labelByShortCode[shortCode];
    // Optimistic: paint immediately so the preview updates without waiting for the round-trip.
    setLabelByShortCode((m) => {
      const next = { ...m };
      if (trimmed) next[shortCode] = trimmed;
      else delete next[shortCode];
      return next;
    });
    try {
      // Empty string clears the override → public profile falls back to the host.
      await setLinkOgOverride(shortCode, { ogTitle: trimmed || null });
    } catch (err) {
      // Roll back optimistic update on failure so the editor doesn't lie about what's saved.
      setLabelByShortCode((m) => {
        const next = { ...m };
        if (prev != null) next[shortCode] = prev;
        else delete next[shortCode];
        return next;
      });
      toast(errorMessage(err, t("saveFailed")), "error");
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

  const metaForm = (
    <ProfileMetaForm
      profile={profile}
      username={username}
      bio={bio}
      theme={theme}
      savingProfile={savingProfile}
      autoSaveStatus={autoSaveStatus}
      onUsernameChange={setUsername}
      onBioChange={setBio}
      onThemeChange={setTheme}
      onAvatarChange={(avatarUrl) => setProfile((p) => (p ? { ...p, avatarUrl } : p))}
      onBannerChange={(bannerUrl) => setProfile((p) => (p ? { ...p, bannerUrl } : p))}
      socials={socials}
      onSocialsChange={setSocials}
      onSave={handleSaveProfile}
      t={t}
    />
  );

  // No username yet → just show the claim flow.
  if (!profile?.username) {
    return (
      <div className="space-y-5">
        <p className="text-xs text-slate-500">{t("intro")}</p>
        {metaForm}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section label={t("sectionProfile")}>
        <div className="rounded-lg border border-slate-200 bg-white p-4">{metaForm}</div>
      </Section>

      <Section label={t("sectionAddLink")}>
        <ProfileQuickAdd onAdded={refresh} highlightEmpty={items.length === 0} />
      </Section>

      <Section label={t("sectionFeed")}>
        <ProfileFeedEditor
          items={items}
          links={links}
          highlightedShortCode={highlightedShortCode}
          pendingShortCode={pendingShortCode}
          dragIndex={dragIndex}
          overIndex={overIndex}
          labelByShortCode={labelByShortCode}
          onAddText={handleAddText}
          onAddDivider={handleAddDivider}
          onAddImage={handleAddImage}
          onAddEmbed={handleAddEmbed}
          onAddContactCard={handleAddContactCard}
          onAddGallery={handleAddGallery}
          onAddProductCard={handleAddProductCard}
          onAddEmailForm={handleAddEmailForm}
          onAddBooking={handleAddBooking}
          onAddEvent={handleAddEvent}
          onAddPlace={handleAddPlace}
          onMove={move}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onHighlight={handleHighlight}
          onToggle={handleToggle}
          onEditBlock={handleEditBlock}
          onDeleteBlock={handleDeleteBlock}
          onEditLabel={handleEditLabel}
          t={t}
        />
      </Section>

      <ContactCardBlockDialog
        open={contactCardDialog.open}
        initialJson={contactCardDialog.initialPayload}
        onOpenChange={(open) =>
          !open && contactCardDialog.close()
        }
        onSubmit={(json) =>
          persistJsonBlock("CONTACT_CARD", contactCardDialog.blockId, json)
        }
        t={t}
      />
      <GalleryBlockDialog
        open={galleryDialog.open}
        initialJson={galleryDialog.initialPayload}
        onOpenChange={(open) =>
          !open && galleryDialog.close()
        }
        onSubmit={(json) => persistJsonBlock("GALLERY", galleryDialog.blockId, json)}
        t={t}
      />
      <ProductCardBlockDialog
        open={productCardDialog.open}
        initialJson={productCardDialog.initialPayload}
        onOpenChange={(open) =>
          !open && productCardDialog.close()
        }
        onSubmit={(json) =>
          persistJsonBlock("PRODUCT_CARD", productCardDialog.blockId, json)
        }
        t={t}
      />
      <EmailFormBlockDialog
        open={emailFormDialog.open}
        initialJson={emailFormDialog.initialPayload}
        onOpenChange={(open) =>
          !open && emailFormDialog.close()
        }
        onSubmit={(json) =>
          persistJsonBlock("EMAIL_FORM", emailFormDialog.blockId, json)
        }
        t={t}
      />
      <BookingBlockDialog
        open={bookingDialog.open}
        initialJson={bookingDialog.initialPayload}
        onOpenChange={(open) =>
          !open && bookingDialog.close()
        }
        onSubmit={(json) => persistJsonBlock("BOOKING", bookingDialog.blockId, json)}
        t={t}
      />
      <EventBlockDialog
        open={eventDialog.open}
        initialJson={eventDialog.initialPayload}
        onOpenChange={(open) => !open && eventDialog.close()}
        onSubmit={(json) => persistJsonBlock("EVENT", eventDialog.blockId, json)}
        t={t}
      />
      <PlaceBlockDialog
        open={placeDialog.open}
        initialJson={placeDialog.initialPayload}
        onOpenChange={(open) => !open && placeDialog.close()}
        onSubmit={(json) => persistJsonBlock("PLACE", placeDialog.blockId, json)}
        t={t}
      />
      <ImageBlockDialog
        open={imageDialog.open}
        initialUrl={imageDialog.initialPayload}
        onOpenChange={(open) => !open && imageDialog.close()}
        onSubmit={(url) => persistImageBlock(imageDialog.blockId, url)}
        t={t}
      />
      <EmbedBlockDialog
        open={embedDialog.open}
        initialUrl={embedDialog.initialPayload}
        onOpenChange={(open) => !open && embedDialog.close()}
        onSubmit={(url) => persistEmbedBlock(embedDialog.blockId, url)}
        t={t}
      />
      <TextBlockDialog
        open={textDialog.open}
        initialContent={textDialog.initialPayload}
        onOpenChange={(open) => !open && textDialog.close()}
        onSubmit={(content) => persistTextBlock(textDialog.blockId, content)}
        t={t}
      />
    </div>
  );
}

/**
 * Small uppercase label above a section block. Visually anchors each card so the page reads as
 * "profile / add link / feed" instead of three undifferentiated cards stacked together.
 */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
