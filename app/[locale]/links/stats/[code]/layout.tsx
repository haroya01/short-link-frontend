import type { Metadata } from "next";
import { messagesScopeLayout } from "@/i18n/messages-scope";
import { LINKS_TITLE_TEMPLATE } from "@/lib/page-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: { default: `/${code}`, template: LINKS_TITLE_TEMPLATE },
    robots: { index: false, follow: false },
  };
}

export default messagesScopeLayout("links/stats/[code]");
