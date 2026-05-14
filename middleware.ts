import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run next-intl on every request that isn't an asset, API, or OAuth callback. The previous
  // exclusion of {@code [0-9A-Za-z]{3,16}$} (short-code paths) is gone now that the kurl.me
  // Cloudflare Worker routes those to the backend before they ever reach Next.js — keeping
  // the exclusion was silently breaking locale redirects for reserved frontend paths that
  // happened to fit the 3-16 alnum pattern (/showcase, /about, /login, /pricing → all 404'd
  // because middleware skipped them and `/showcase` doesn't exist without the locale prefix).
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|.*\\..*|oauth2|login/oauth2).*)",
  ],
};
