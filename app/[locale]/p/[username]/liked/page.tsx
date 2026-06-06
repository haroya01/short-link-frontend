import { redirect } from "next/navigation";
import { blogHref } from "@/lib/host";

export const dynamic = "force-dynamic";

/**
 * The reading library (bookmarks + likes) is a private tool, so it lives in the workspace
 * (/blog/curation), not as an owner-only tab on the public profile. This legacy route just forwards
 * there so old links / bookmarks don't 404.
 */
export default function LikedRedirect() {
  redirect(blogHref("/curation"));
}
