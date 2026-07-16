import { cookies } from "next/headers";
import { notFound } from "next/navigation";

// The client sets this on every authenticated bootstrap/token grant (lib/session-hint.ts). It is the
// only login signal the server can read on a page navigation: the HttpOnly refresh_token cookie is
// scoped to Path=/api/v1/auth, so the browser never sends it here, and the access token lives in
// per-origin localStorage. This cookie is Domain=.kurl.me, path=/ — visible on both the apex admin
// (kurl.me/admin) and the blog admin (blog.kurl.me/blog/admin).
const SESSION_HINT_COOKIE = "kurl_has_session";

/**
 * Server-side gate for the admin surface. Admin existence must not be inferable by an anonymous
 * prober: a signed-out visitor gets a hard 404 (the existence of the route is hidden), never a login
 * bounce or an app shell.
 *
 * The server can only tell login-vs-anonymous (no admin ROLE cookie exists — role comes from the
 * client /me call), so this only hides the route from anonymous scanners. A signed-in NON-admin
 * still falls through to the client-side guard in the admin pages, which renders the same 404 after
 * hydration. Mock mode (NEXT_PUBLIC_USE_MOCKS=1) never has a session cookie on the first server hit;
 * the client seeds one after hydration, so the client guard governs there.
 *
 * MUST be called from a PAGE segment (the server page.tsx), never a layout or generateMetadata:
 * notFound() only sets a 404 status code when it's thrown from a page. Thrown from a layout (or a
 * layout's generateMetadata), Next renders the not-found UI but commits HTTP 200 — the not-found
 * boundary is a child of the layout, so the status is already sent. Verified on Next 14.2.5. Each
 * admin route therefore keeps a thin server page.tsx that guards, then renders its client view; the
 * page is force-dynamic so cookies() is read per request (a static prerender would bake the empty
 * build-time cookie into a permanent 404 for everyone, admins included).
 */
export function guardAdminServer(): void {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "1") return;
  const hasSession = cookies().get(SESSION_HINT_COOKIE)?.value === "1";
  if (!hasSession) notFound();
}
