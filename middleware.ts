import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|favicon.ico|.*\\..*|oauth2|login/oauth2|[0-9A-Za-z]{7}$).*)",
  ],
};
