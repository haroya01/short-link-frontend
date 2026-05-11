"use client";

import { useEffect, useRef, useState } from "react";
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
  toggleLinkOnProfile,
  updateMyProfile,
  updateProfileBlock,
} from "@/lib/api";
import type {
  MyLink,
  MyProfile,
  ProfileReorderItem,
  ProfileTheme,
  Social,
} from "@/types";
import { ProfileFeedEditor } from "./profile-section/ProfileFeedEditor";
import { ProfileMetaForm } from "./profile-section/ProfileMetaForm";
import type { FeedItem } from "./profile-section/types";
import { ProfileQuickAdd } from "./profile-quick-add";

export type ProfileDraft = {
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socials: Social[];
  featured: string[];
  links: MyLink[];
  /**
   * Per-shortCode label override. The link list itself only carries originalUrl, but the public
   * profile feed enriches each LINK with its effective OG title (= user's label). We thread it
   * down so the preview can show "📝 Blog" instead of "blog.example.com".
   */
  labelByShortCode: Record<string, string>;
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
  const [highlightedShortCode, setHighlightedShortCode] = useState<string | null>(null);
  const [pendingShortCode, setPendingShortCode] = useState<string | null>(null);
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

  const featured = items
    .filter((i): i is { kind: "LINK"; code: string } => i.kind === "LINK")
    .map((i) => i.code);

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
      featured,
      links: links ?? [],
      labelByShortCode,
    });
  }, [
    username,
    bio,
    theme,
    profile?.avatarUrl,
    profile?.bannerUrl,
    socials,
    featured,
    links,
    labelByShortCode,
    onDraft,
  ]);

  // After the username is claimed, bio + theme silently auto-save 600ms after the last change.
  // Username keeps its explicit Save button because changing it costs the user their old URL —
  // we want intent for that, but everything else should "just save" so the editor feels alive.
  useEffect(() => {
    if (!profile?.username) return;
    // Drop entries with empty URL so the user can leave a chip enabled while still drafting the
    // URL — only complete pairs trigger a save. Empty string later signals "clear all" to the API.
    const socialsCleaned = socials.filter((s) => s.url.trim().length > 0);
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
          kind: "LINK" | "TEXT" | "DIVIDER" | "IMAGE";
          id: number | null;
          shortCode: string | null;
          ogTitle?: string | null;
          highlighted?: boolean | null;
          content?: string | null;
        }>;
        const next: FeedItem[] = [];
        const labels: Record<string, string> = {};
        for (const e of entries) {
          if (e.kind === "LINK" && e.shortCode) {
            next.push({ kind: "LINK", code: e.shortCode });
            if (e.ogTitle) labels[e.shortCode] = e.ogTitle;
          } else if (e.kind === "TEXT" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "TEXT", content: e.content ?? "" });
          } else if (e.kind === "DIVIDER" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "DIVIDER", content: null });
          } else if (e.kind === "IMAGE" && e.id != null) {
            next.push({ kind: "BLOCK", id: e.id, type: "IMAGE", content: e.content ?? "" });
          }
        }
        setItems(next);
        setLabelByShortCode(labels);
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
      const cleanedSocials = socials.filter((s) => s.url.trim().length > 0);
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

  function handleDragLeave(idx: number) {
    if (overIndex === idx) setOverIndex(null);
  }

  function handleDrop(toIndex: number, e: React.DragEvent) {
    e.preventDefault();
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

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
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
          onAddText={handleAddText}
          onAddDivider={handleAddDivider}
          onAddImage={handleAddImage}
          onMove={move}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onHighlight={handleHighlight}
          onToggle={handleToggle}
          onEditBlock={handleEditBlock}
          onDeleteBlock={handleDeleteBlock}
          t={t}
        />
      </Section>
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
