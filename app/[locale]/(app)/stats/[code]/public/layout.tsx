import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `/${code} · public stats · kurl`,
    robots: { index: false, follow: false },
  };
}

export default function PublicStatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
