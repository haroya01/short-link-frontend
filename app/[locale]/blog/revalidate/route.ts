import { revalidateTag } from "next/cache";
import { fetchWithTimeout } from "@/lib/api/fetch-timeout";
import { AUTHOR_POSTS_TAG, PUBLIC_POSTS_TAG } from "@/modules/blog/api/public-posts";
import { allowRevalidate } from "@/modules/blog/lib/revalidate-limit";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (MOCKS) return new Response(null, { status: 204 });
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response(null, { status: 401 });
  const body = (await req.json().catch(() => null)) as { postId?: unknown } | null;
  const postId = body?.postId;
  if (typeof postId !== "number" || !Number.isSafeInteger(postId) || postId <= 0) {
    return new Response(null, { status: 400 });
  }
  const init: RequestInit = { cache: "no-store", headers: { Authorization: authorization } };
  try {
    const [me, post] = await Promise.all([
      fetchWithTimeout(`${API_BASE}/api/v1/users/me`, init),
      fetchWithTimeout(`${API_BASE}/api/v1/posts/${postId}`, init),
    ]);
    if (!me.ok || !post.ok) return new Response(null, { status: 403 });
    const { username } = (await me.json()) as { username?: string | null };
    if (!username) return new Response(null, { status: 403 });
    if (!allowRevalidate(username)) return new Response(null, { status: 429 });
    revalidateTag(AUTHOR_POSTS_TAG(username));
    revalidateTag(PUBLIC_POSTS_TAG);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 502 });
  }
}
