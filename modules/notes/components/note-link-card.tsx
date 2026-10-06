"use client";

import type { NoteLinkPreview } from "@/modules/notes/api/notes";

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function NoteLinkCard({ preview, linked = true }: { preview: NoteLinkPreview; linked?: boolean }) {
  const domain = host(preview.url);
  const frame = "mt-2.5 block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800";
  const content = (
    <>
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="block aspect-[1.91/1] w-full border-b border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900"
        />
      )}
      <span className="block px-3.5 py-2.5">
        <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">{domain}</span>
        {preview.title && (
          <span className="mt-0.5 line-clamp-2 block text-[15px] font-medium leading-snug text-slate-900 dark:text-slate-100">
            {preview.title}
          </span>
        )}
        {preview.description && !preview.image && (
          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-500 dark:text-slate-400">
            {preview.description}
          </span>
        )}
      </span>
    </>
  );
  if (!linked) {
    return (
      <div className={frame} data-note-link-card>
        {content}
      </div>
    );
  }
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="nofollow noopener noreferrer"
      data-note-link-card
      className={`focus-ring ${frame} transition-colors hover:bg-slate-50 dark:hover:bg-slate-900`}
    >
      {content}
    </a>
  );
}
