import { redirect } from "next/navigation";
import { blogHref } from "@/lib/host";

export const dynamic = "force-dynamic";

/**
 * Post analytics live in the blog workspace at /blog/analytics — the canonical, fuller implementation
 * (posts + series + referrers + per-post drilldown). This route used to host a hand-rolled duplicate
 * post-analytics page under the links product; it now forwards to the canonical one so old links don't
 * 404. (Per-link click stats are unaffected — they remain at /links/stats/[code].)
 */
export default function LinksStatsRedirect() {
  redirect(blogHref("/analytics"));
}
