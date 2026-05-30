"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Markdown } from "@/modules/blog/components/markdown";
import { fenceFor } from "@/modules/blog/lib/markdown-to-blocks";

/**
 * A post code block: syntax-highlighted (through the shared markdown pipeline) with a language label
 * and a copy button — the table stakes for a developer-facing blog. The button reveals on hover and
 * copies the raw code (not the highlighted HTML).
 */
export function PostCode({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (insecure context / permissions) — nothing to do */
    }
  };

  const fence = fenceFor(code);
  return (
    <div className="group relative">
      {lang && (
        <span className="absolute left-4 top-2.5 z-10 select-none font-mono text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {lang}
        </span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-3 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[12px] font-medium text-slate-300 opacity-0 backdrop-blur transition-opacity hover:bg-white/20 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </button>
      <Markdown>{`${fence}${lang}\n${code}\n${fence}`}</Markdown>
    </div>
  );
}
