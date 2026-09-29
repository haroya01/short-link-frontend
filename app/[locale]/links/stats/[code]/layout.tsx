import type { Metadata } from "next";
import { messagesScopeLayout } from "@/i18n/messages-scope";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `/${code} · kurl`,
    robots: { index: false, follow: false },
  };
}

export default messagesScopeLayout("links/stats/[code]");
