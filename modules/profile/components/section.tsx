"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  createProfileBlock,
  deleteProfileBlock,
  getMyProfile,
  listAllMyLinks,
  setLinkHighlight,
  setLinkOgOverride,
  toggleLinkOnProfile,
  updateMyProfile,
  updateProfileBlock,
} from "@/lib/api";
import { track } from "@/components/common/posthog-provider";
import { ErrorState } from "@/components/common/error-state";
import type {
  MyLink,
  MyProfile,
  ProfileTheme,
  PublicProfileEntry,
  Social,
} from "@/types";
import {
  BlockDialogStack,
  type BlockDialogs,
} from "@/modules/profile/curation/block-dialog-stack";
import { ProfileFeedEditor } from "@/modules/profile/curation/profile-feed-editor";
import { ProfileMetaForm } from "@/modules/profile/curation/profile-meta-form";
import { useBlockDialog } from "@/modules/profile/curation/use-block-dialog";
import { useFeedReorder } from "@/modules/profile/curation/use-feed-reorder";
import { useProfileAutosave } from "@/modules/profile/curation/use-profile-autosave";
import { socialUrlPrefix } from "@/modules/profile/curation/socials-templates";
import type { FeedItem } from "@/modules/profile/curation/types";
import {
  parsePublicFeed,
  type PublicFeedEntryShape,
} from "@/modules/profile/curation/parse-public-feed";
import { SectionLabel } from "@/modules/profile/curation/section-label";
import { ProfileQuickAdd } from "@/modules/profile/components/quick-add";

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
  // 최초 로드 성공 여부와 실패 여부를 따로 추적한다. 이 구분이 없으면 getMyProfile
  // 일시 실패가 '핸들 미보유'와 뒤섞여 유저네임 클레임 폼으로 위장한다. loadedRef 는
  // 로드 이펙트 안에서 재렌더 없이 '이미 로드됐는지'를 읽기 위한 것(백그라운드 새로고침 구분).
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const [loadError, setLoadError] = useState(false);
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
  // one line each + gives them a uniform `show()` / `close()` surface; `BlockDialogStack` then
  // renders every mount in one place. Payload meaning: contactCard/gallery/productCard/emailForm/
  // booking/event/place → JSON config; image/embed → URL string; text → markdown content.
  const dialogs: BlockDialogs = {
    contactCard: useBlockDialog<string>(),
    gallery: useBlockDialog<string>(),
    productCard: useBlockDialog<string>(),
    emailForm: useBlockDialog<string>(),
    booking: useBlockDialog<string>(),
    event: useBlockDialog<string>(),
    place: useBlockDialog<string>(),
    image: useBlockDialog<string>(),
    embed: useBlockDialog<string>(),
    text: useBlockDialog<string>(),
  };
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);
  const handleAutoSaved = useCallback((updated: MyProfile) => setProfile(updated), []);
  const autoSaveStatus = useProfileAutosave({
    profile,
    bio,
    theme,
    socials,
    onSaved: handleAutoSaved,
  });
  const reorder = useFeedReorder({ items, setItems });

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

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), listAllMyLinks({ size: 100 })])
      .then(([prof, allLinks]) => {
        if (cancelled) return;
        setProfile(prof);
        setUsername(prof.username ?? "");
        setBio(prof.bio ?? "");
        setTheme(prof.theme ?? null);
        setSocials(prof.socials ?? []);
        setLinks(allLinks);
        loadedRef.current = true;
        setLoaded(true);
        setLoadError(false);
      })
      .catch(() => {
        if (cancelled) return;
        // 최초 로드 실패는 에러 화면으로 구분해 재시도를 유도한다. 한 번 로드된 뒤의
        // 백그라운드 새로고침(링크 추가 등) 실패는 편집기를 그대로 유지한다.
        if (!loadedRef.current) setLoadError(true);
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
        const parsed = parsePublicFeed((data.entries ?? []) as PublicFeedEntryShape[]);
        setItems(parsed.items);
        setLabelByShortCode(parsed.labelByShortCode);
        setOgImageByShortCode(parsed.ogImageByShortCode);
        setHighlightedShortCode(parsed.highlightedShortCode);
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
      const usernameJustClaimed = !profile?.username && Boolean(updated.username);
      setProfile(updated);
      if (usernameJustClaimed && updated.username) {
        track("username_claimed", { username: updated.username });
      }
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

  /**
   * Optimistic edit for an existing block — update local items first so the preview reflects
   * the new content immediately, then sync to BE in the background. On API failure, refresh
   * from the server to recover the canonical state. Previous flow awaited the API roundtrip
   * (100–500ms over mobile networks) before touching state, which made the live preview
   * feel laggy — user types in dialog, hits Save, then waits to see the change land.
   */
  function applyBlockEditOptimistic(blockId: number, newContent: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.kind === "BLOCK" && i.id === blockId ? { ...i, content: newContent } : i,
      ),
    );
    updateProfileBlock(blockId, newContent).catch((err) => {
      toast(errorMessage(err, t("toggleFailed")), "error");
      refresh(); // pulls canonical state back so the optimistic UI doesn't lie indefinitely
    });
  }

  async function persistTextBlock(blockId: number | null, content: string) {
    if (blockId != null) {
      applyBlockEditOptimistic(blockId, content);
      return;
    }
    try {
      const block = await createProfileBlock({ type: "TEXT", content });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type: "TEXT", content: block.content ?? "" },
      ]);
      track("block_added", { type: "TEXT" });
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
      track("block_added", { type: "DIVIDER" });
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function persistImageBlock(blockId: number | null, url: string) {
    if (blockId != null) {
      applyBlockEditOptimistic(blockId, url);
      return;
    }
    try {
      const block = await createProfileBlock({ type: "IMAGE", content: url });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type: "IMAGE", content: block.content ?? "" },
      ]);
      track("block_added", { type: "IMAGE" });
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function persistJsonBlock(
    type: "CONTACT_CARD" | "GALLERY" | "PRODUCT_CARD" | "EMAIL_FORM" | "BOOKING" | "EVENT" | "PLACE",
    blockId: number | null,
    configJson: string,
  ) {
    if (blockId != null) {
      applyBlockEditOptimistic(blockId, configJson);
      return;
    }
    try {
      const block = await createProfileBlock({ type, content: configJson });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type, content: block.content ?? "" },
      ]);
      track("block_added", { type });
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  async function persistEmbedBlock(blockId: number | null, url: string) {
    if (blockId != null) {
      applyBlockEditOptimistic(blockId, url);
      return;
    }
    try {
      const block = await createProfileBlock({ type: "EMBED", content: url });
      setItems((prev) => [
        ...prev,
        { kind: "BLOCK", id: block.id, type: "EMBED", content: block.content ?? "" },
      ]);
      track("block_added", { type: "EMBED" });
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    }
  }

  // Map every editable block type to the dialog that owns its form. DIVIDER blocks have no
  // editable payload so they're absent from the lookup. JSON-payload dialogs receive `current`
  // as-is; URL/markdown dialogs coerce an empty string to `null` so the form starts blank.
  const editDialogByBlockType: Partial<Record<string, (blockId: number, current: string) => void>> = {
    CONTACT_CARD: (id, c) => dialogs.contactCard.show(id, c),
    GALLERY: (id, c) => dialogs.gallery.show(id, c),
    PRODUCT_CARD: (id, c) => dialogs.productCard.show(id, c),
    EMAIL_FORM: (id, c) => dialogs.emailForm.show(id, c),
    BOOKING: (id, c) => dialogs.booking.show(id, c),
    EVENT: (id, c) => dialogs.event.show(id, c),
    PLACE: (id, c) => dialogs.place.show(id, c),
    IMAGE: (id, c) => dialogs.image.show(id, c || null),
    EMBED: (id, c) => dialogs.embed.show(id, c || null),
    TEXT: (id, c) => dialogs.text.show(id, c || null),
  };

  async function handleEditBlock(blockId: number, current: string) {
    const item = items.find((i) => i.kind === "BLOCK" && i.id === blockId);
    const blockType = item?.kind === "BLOCK" ? item.type : null;
    if (!blockType) return;
    editDialogByBlockType[blockType]?.(blockId, current);
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

  // 최초 로드가 끝나기 전이나 실패했을 때를 '핸들 미보유'와 구분한다. 구분하지 않으면
  // getMyProfile 일시 실패가 유저네임 클레임 폼으로 위장해 계정이 초기화된 것처럼 보인다.
  if (!loaded) {
    if (loadError) {
      return (
        <ErrorState
          onRetry={() => {
            setLoadError(false);
            refresh();
          }}
        />
      );
    }
    return <p className="px-1 text-xs text-slate-500">{t("loading")}</p>;
  }

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
      <SectionLabel label={t("sectionProfile")}>
        <div className="rounded-lg border border-slate-200 bg-white p-4">{metaForm}</div>
      </SectionLabel>

      <SectionLabel label={t("sectionAddLink")}>
        <ProfileQuickAdd onAdded={refresh} highlightEmpty={items.length === 0} />
      </SectionLabel>

      <SectionLabel label={t("sectionFeed")}>
        <ProfileFeedEditor
          items={items}
          links={links}
          highlightedShortCode={highlightedShortCode}
          pendingShortCode={pendingShortCode}
          dragIndex={reorder.dragIndex}
          overIndex={reorder.overIndex}
          labelByShortCode={labelByShortCode}
          onAddText={() => dialogs.text.show(null, null)}
          onAddDivider={handleAddDivider}
          onAddImage={() => dialogs.image.show(null, null)}
          onAddEmbed={() => dialogs.embed.show(null, null)}
          onAddContactCard={() => dialogs.contactCard.show(null, null)}
          onAddGallery={() => dialogs.gallery.show(null, null)}
          onAddProductCard={() => dialogs.productCard.show(null, null)}
          onAddEmailForm={() => dialogs.emailForm.show(null, null)}
          onAddBooking={() => dialogs.booking.show(null, null)}
          onAddEvent={() => dialogs.event.show(null, null)}
          onAddPlace={() => dialogs.place.show(null, null)}
          onMove={reorder.move}
          onDragStart={reorder.onDragStart}
          onDragOver={reorder.onDragOver}
          onDrop={reorder.onDrop}
          onDragEnd={reorder.onDragEnd}
          onHighlight={handleHighlight}
          onToggle={handleToggle}
          onEditBlock={handleEditBlock}
          onDeleteBlock={handleDeleteBlock}
          onEditLabel={handleEditLabel}
          t={t}
        />
      </SectionLabel>

      <BlockDialogStack
        dialogs={dialogs}
        persistJsonBlock={persistJsonBlock}
        persistImageBlock={persistImageBlock}
        persistEmbedBlock={persistEmbedBlock}
        persistTextBlock={persistTextBlock}
        t={t}
      />
    </div>
  );
}
