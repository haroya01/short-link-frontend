import { redirect } from "next/navigation";
import { blogPath } from "@/lib/host";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (key === "tab" || typeof value !== "string") continue;
    query.set(key, value);
  }
  const rest = query.toString();
  redirect(`/${locale}${blogPath(rest ? `/notes?${rest}` : "/notes")}`);
}
