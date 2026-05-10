import type { ThemeColors } from "../_lib/theme";

export function ImageEntryCard({ url, colors }: { url: string; colors: ThemeColors }) {
  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`block overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          loading="lazy"
          className="block w-full bg-slate-100 object-cover"
        />
      </a>
    </li>
  );
}
