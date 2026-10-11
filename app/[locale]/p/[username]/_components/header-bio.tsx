"use client";

import { usePathname } from "next/navigation";
import { contentLang } from "@/modules/blog/lib/content-lang";
import { useOwnProfile } from "@/modules/blog/lib/own-profile";
import { authorTail } from "./profile-chrome";

export function HeaderBio({ bio: serverBio, username }: { bio: string | null; username: string }) {
  const pathname = usePathname();
  const own = useOwnProfile(username);
  const bio = own ? own.bio : serverBio;
  const tail = authorTail(pathname);
  if (!bio || (tail.length === 1 && tail[0] === "about")) return null;
  return (
    <p lang={contentLang(bio)} className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
      {bio}
    </p>
  );
}
