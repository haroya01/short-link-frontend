"use client";

import { useState } from "react";
import {
  buildAuthorShareUrl,
  buildSharePlatformIntent,
  type SharePlatform,
} from "@/lib/publishing-share";

type Props = {
  postUrl: string;
  postSlug: string;
  postTitle: string;
};

const PLATFORMS: { id: SharePlatform; label: string }[] = [
  { id: "twitter", label: "Twitter / X" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "line", label: "LINE" },
  { id: "copy", label: "링크 복사" },
];

export function ShareButton({ postUrl, postSlug, postTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handlePlatform(platform: SharePlatform) {
    const shareUrl = buildAuthorShareUrl(postUrl, postSlug, platform);
    const intent = buildSharePlatformIntent(shareUrl, postTitle, platform);

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // 권한 거부 / insecure context — fallback: prompt
        window.prompt("이 URL 을 복사하세요", shareUrl);
      }
      return;
    }

    if (intent) {
      window.open(intent, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        공유
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                handlePlatform(p.id);
                if (p.id !== "copy") setOpen(false);
              }}
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {p.id === "copy" && copied ? "복사됨!" : p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
