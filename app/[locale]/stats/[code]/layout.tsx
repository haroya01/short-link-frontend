import type { Metadata } from "next";

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

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
