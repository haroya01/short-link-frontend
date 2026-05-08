const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND}/api/v1/:path*` },
      { source: "/oauth2/:path*", destination: `${BACKEND}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${BACKEND}/login/oauth2/:path*` },
      { source: "/:code([0-9A-Za-z]{3,16})", destination: `${BACKEND}/:code` },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
