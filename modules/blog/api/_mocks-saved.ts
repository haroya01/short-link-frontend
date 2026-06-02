/**
 * In-memory mocks for the viewer's 보관함 (liked + bookmarked posts with folders). Reuses the public
 * feed items as the "posts I saved/liked". Module-level so edits (move to folder, new folder, remove)
 * persist across the SPA session; a reload reseeds. See saved.ts for the public contract.
 */
import { MOCK_ALL_ITEMS } from "@/modules/blog/api/_mocks";
import type { PublicFeedItem } from "@/modules/blog/api/public-posts";
import type { BookmarkFolder, SavedPost } from "@/modules/blog/api/saved";

// Liked: a handful of posts the viewer hearted.
const LIKED_SLUGS = [
  "nextjs-14-app-router-blog",
  "hexagonal-too-much",
  "killed-side-project",
  "design-tokens-to-tailwind",
  "naming-things",
];

const bySlug = (slug: string) => MOCK_ALL_ITEMS.find((i) => i.slug === slug);

export function mockListLikedFeed(): PublicFeedItem[] {
  return LIKED_SLUGS.map(bySlug).filter((x): x is PublicFeedItem => Boolean(x));
}

// Folders (manual). Seeded with two; users add more.
const folders = new Map<number, string>();
let folderSeq = 9000;
folders.set(++folderSeq, "나중에 읽기");
const FOLDER_LATER = folderSeq;
folders.set(++folderSeq, "영감");
const FOLDER_INSPO = folderSeq;

// Saved posts → folderId (null = unfiled, auto-grouped by tag in the UI).
const saved = new Map<number, SavedPost>();
function seedSaved(slug: string, folderId: number | null) {
  const it = bySlug(slug);
  if (it) saved.set(it.id, { ...it, folderId });
}
seedSaved("nextjs-14-app-router-blog", FOLDER_LATER);
seedSaved("spring-tx-propagation", FOLDER_LATER);
seedSaved("design-tokens-to-tailwind", FOLDER_INSPO);
seedSaved("typescript-generics-hard", null); // → auto "개발"
seedSaved("hexagonal-too-much", null); // → auto "개발"
seedSaved("killed-side-project", null); // → auto "회고"
seedSaved("kyoto-workation", null); // → auto "일상"

export function mockListSavedFeed(): SavedPost[] {
  return [...saved.values()];
}

export function mockListFolders(): BookmarkFolder[] {
  const counts = new Map<number, number>();
  for (const s of saved.values()) if (s.folderId != null) counts.set(s.folderId, (counts.get(s.folderId) ?? 0) + 1);
  return [...folders.entries()].map(([id, name]) => ({ id, name, count: counts.get(id) ?? 0 }));
}

export function mockCreateFolder(name: string): BookmarkFolder {
  const id = ++folderSeq;
  folders.set(id, name);
  return { id, name, count: 0 };
}

export function mockRenameFolder(id: number, name: string): BookmarkFolder {
  folders.set(id, name);
  const count = [...saved.values()].filter((s) => s.folderId === id).length;
  return { id, name, count };
}

export function mockDeleteFolder(id: number): void {
  folders.delete(id);
  // Items in the deleted folder fall back to unfiled (auto-grouped).
  for (const [pid, s] of saved) if (s.folderId === id) saved.set(pid, { ...s, folderId: null });
}

export function mockMoveToFolder(postId: number, folderId: number | null): void {
  const s = saved.get(postId);
  if (s) saved.set(postId, { ...s, folderId });
}

export function mockRemoveSaved(postId: number): void {
  saved.delete(postId);
}
