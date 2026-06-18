import { KurlLinkCard } from "url-shortener";

/**
 * KurlLinkCard self-fetches a short link's public stats by code and renders one of two states:
 * an "ok" mini-dashboard (clicks + top country/device + sparkline) or a plain-link "fallback"
 * card. The preview's data source (@/lib/api/stats) is stubbed (.design-sync/stubs/api-stats.ts)
 * to return sample stats for code "spring" and reject every other code — so both stories below
 * render the REAL component, just with sample data.
 */

/** "ok" state — link opted into public stats, rendered as a live mini-dashboard. */
export const WithStats = () => (
  <div style={{ maxWidth: 540, padding: "0 16px" }}>
    <KurlLinkCard code="spring" url="https://kurl.me/spring" />
  </div>
);

/** Fallback — link not opted into public stats (or stats unavailable): a plain link card. */
export const Fallback = () => (
  <div style={{ maxWidth: 540, padding: "0 16px" }}>
    <KurlLinkCard code="kurl-blog" url="https://kurl.me/kurl-blog" />
  </div>
);
