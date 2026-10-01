import type { PublicProfile } from "@/types";
import { mockPublicProfile } from "@/modules/profile/mock-profile";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/**
 * `null` only when the backend says there is no such profile — the page turns that into a real 404 so
 * `anything.kurl.me` can't pass for a kurl page. A backend that is down or erroring throws instead:
 * answering 404 for a real person during an outage would get their page dropped from search.
 */
export async function fetchProfile(username: string): Promise<PublicProfile | null> {
  // Demo/mock mode: render a stand-in link-in-bio so the surface (and the blog→프로필 cross-link)
  // works without a backend.
  if (USE_MOCKS) return mockPublicProfile(username);
  // No backend configured (local dev without mocks): nothing can exist.
  if (!API_BASE) return null;
  // Short revalidate so owner edits show up within ~30s without smashing the backend per visit.
  // The backend layers a 5min Redis cache that auto-evicts on profile/toggle/reorder writes.
  const res = await fetch(`${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`profile fetch failed: ${res.status}`);
  return (await res.json()) as PublicProfile;
}
