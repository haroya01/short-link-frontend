import { redactCard } from "@/modules/blog/lib/post-audience";
import type { Note } from "@/modules/notes/api/notes";
import { fetchPublic, hasViewer, PUBLIC_POSTS_TAG, type FetchResult, type PublicFeedItem } from "./public-posts";

const noteMocks: typeof import("@/modules/notes/api/_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("@/modules/notes/api/_mocks") : null;

export const HOME_TABS = ["following", "latest", "trending"] as const;
export type HomeTab = (typeof HOME_TABS)[number];
const HOME_PAGE_SIZE = 20;

export interface HomePost extends PublicFeedItem {
  readMinutes: number;
  commentCount: number;
  likedByMe: boolean | null;
  room?: { id: number; name: string } | null;
}

export type HomeItem = { kind: "note"; note: Note } | { kind: "post"; post: HomePost };

/** Backend contract: GET /api/v1/public/home?tab=&limit=&cursor= — one feed of notes and posts;
 *  following is empty when signed out. `next` is an opaque cursor, null at the end. */
export interface HomePage {
  items: HomeItem[];
  next: string | null;
  /** First page and since answers: the marker to send as `since` on the next refresh. */
  newest?: string | null;
  /** A since answer that could not reach the marker: `items` is a fresh first page to replace the list. */
  gap?: boolean;
}

function tidy(page: HomePage): HomePage {
  const items = (Array.isArray(page?.items) ? page.items : []).flatMap((item): HomeItem[] => {
    if (item?.kind === "note" && item.note) return [{ kind: "note", note: item.note }];
    if (item?.kind === "post" && item.post) return [{ kind: "post", post: redactCard(item.post) }];
    return [];
  });
  return {
    items,
    next: typeof page?.next === "string" && page.next !== "" ? page.next : null,
    ...(typeof page?.newest === "string" ? { newest: page.newest } : {}),
    ...(typeof page?.gap === "boolean" ? { gap: page.gap } : {}),
  };
}

export async function listHome(
  tab: HomeTab,
  cursor: string | null = null,
  limit = HOME_PAGE_SIZE,
): Promise<FetchResult<HomePage>> {
  if (noteMocks) return { ok: true, data: tidy(noteMocks.mockHome(tab, cursor, hasViewer())) };
  const query = `tab=${tab}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const result = await fetchPublic<HomePage>(`/api/v1/public/home?${query}`, { tags: [PUBLIC_POSTS_TAG] });
  return result.ok ? { ok: true, data: tidy(result.data) } : result;
}

export async function listHomeSince(tab: HomeTab, since: string, limit = HOME_PAGE_SIZE): Promise<FetchResult<HomePage>> {
  if (noteMocks) return { ok: true, data: tidy(noteMocks.mockHomeSince(tab, since, hasViewer())) };
  const query = `tab=${tab}&limit=${limit}&since=${encodeURIComponent(since)}`;
  const result = await fetchPublic<HomePage>(`/api/v1/public/home?${query}`, { noStore: true });
  return result.ok ? { ok: true, data: tidy(result.data) } : result;
}
