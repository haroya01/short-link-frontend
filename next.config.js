const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// In dev we proxy /api, /oauth2, /login/oauth2 through Next so the SPA stays same-origin against
// localhost:3001. In prod (Vercel), the frontend calls the backend directly using
// NEXT_PUBLIC_API_BASE (e.g. https://kurl.md) — no rewrites needed and short URLs live on the
// backend apex, not on the SPA host.
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND}/api/v1/:path*` },
      { source: "/oauth2/:path*", destination: `${BACKEND}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${BACKEND}/login/oauth2/:path*` },
      { source: "/:code([0-9A-Za-z]{3,16})", destination: `${BACKEND}/:code` },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
