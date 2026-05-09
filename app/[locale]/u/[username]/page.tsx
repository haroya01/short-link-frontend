import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PublicProfile } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const res = await fetch(`${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("profile fetch failed");
  return (await res.json()) as PublicProfile;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username).catch(() => null);
  if (!profile) return { title: `@${username}` };
  return {
    title: `@${profile.username} · kurl`,
    description: profile.bio ?? `${profile.links.length} links`,
    openGraph: {
      title: `@${profile.username} · kurl`,
      description: profile.bio ?? undefined,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicProfile" });
  const profile = await fetchProfile(username);
  if (!profile) notFound();

  const initial = (profile.username[0] ?? "·").toUpperCase();

  return (
    <div className="container max-w-md py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
          {initial}
        </div>
        <p className="font-mono text-sm text-slate-700">@{profile.username}</p>
        {profile.bio && (
          <p className="text-sm leading-relaxed text-slate-600">{profile.bio}</p>
        )}
      </div>

      <ul className="mt-8 space-y-2">
        {profile.links.length === 0 ? (
          <li className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
            {t("empty")}
          </li>
        ) : (
          profile.links.map((link) => (
            <li key={link.shortCode}>
              <a
                href={`${link.shortUrl}?src=profile-${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {link.ogTitle ?? hostOf(link.originalUrl)}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    /{link.shortCode}
                  </span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-slate-600" />
              </a>
            </li>
          ))
        )}
      </ul>

      <p className="mt-10 text-center text-[11px] text-slate-400">{t("madeWith")}</p>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
