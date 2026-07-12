"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

type Props = {
  url: string;
  size?: number;
  className?: string;
};

/**
 * Renders the destination's favicon next to a link row, with a quiet text-fallback when the host
 * doesn't expose one. Uses Google's public s2 favicon endpoint — no auth, cached at the edge —
 * and silently swaps to a single-letter monogram if the request 404s.
 */
export function Favicon({ url, size = 16, className }: Props) {
  const host = safeHost(url);
  const [errored, setErrored] = useState(false);

  // Email rows have no host (mailto: parses to an empty hostname), so they'd otherwise fall to the
  // blank monogram square. Give them a mail glyph — same tile styling as the letter fallback — so an
  // email link reads as one, next to the real favicons of the other rows.
  if (url.startsWith("mailto:")) {
    return (
      <span
        aria-hidden
        className={
          "inline-flex items-center justify-center rounded bg-slate-100 text-slate-500 " +
          (className ?? "")
        }
        style={{ width: size, height: size }}
      >
        <Mail style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={2} />
      </span>
    );
  }

  if (!host || errored) {
    return (
      <span
        aria-hidden
        className={
          "inline-flex items-center justify-center rounded bg-slate-100 text-[9px] font-semibold uppercase text-slate-500 " +
          (className ?? "")
        }
        style={{ width: size, height: size }}
      >
        {host?.charAt(0) ?? "·"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${host}&sz=${size * 2}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={"shrink-0 rounded " + (className ?? "")}
      style={{ width: size, height: size }}
    />
  );
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
