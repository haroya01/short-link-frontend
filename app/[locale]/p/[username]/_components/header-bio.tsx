"use client";

import { usePathname } from "next/navigation";
import { authorTail } from "./profile-chrome";

export function HeaderBio({ bio }: { bio: string }) {
  const pathname = usePathname();
  const tail = authorTail(pathname);
  if (tail.length === 1 && tail[0] === "about") return null;
  return <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{bio}</p>;
}
