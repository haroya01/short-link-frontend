"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ConnectSheet } from "@/modules/blog/components/connect-sheet";

/**
 * "연결" — connect the whole post to a collection or PATH, at the same rank as 공감/저장. The verb
 * (connect, not broadcast) is a first-class post action so a reader can weave the post into a path
 * the moment they finish it, without leaving the article. Opening the sheet requires an account —
 * an anonymous click starts the login flow, the same gate as the like/bookmark buttons — because a
 * connection is authored per user. The sheet itself (pick collection → the one-line 왜) is the shared
 * ConnectSheet already used on highlights; here it just targets the post block.
 */
export function ConnectButton({ postId, postTitle }: { postId: number; postTitle: string }) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("collections");
  const { authenticated, signInWithGoogle } = useAuth();
  // Pop the icon only on a real click, matching the like/bookmark gate (never on mount).
  const [interacted, setInteracted] = useState(false);
  const [open, setOpen] = useState(false);

  function onClick() {
    setInteracted(true);
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={t("connectPost", { title: postTitle })}
        className="touch-target inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[14px] font-medium text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
      >
        <span className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
          <Link2 className="h-4 w-4" />
        </span>
        {/* Icon + word (동형 with the share button) — "연결" is the verb, so labelling it makes the
            action legible instead of a bare glyph the reader has to guess. */}
        <span>{tc("connectLabel")}</span>
      </button>
      {open && (
        <ConnectSheet
          blockType="POST"
          refId={postId}
          targetLabel={tc("blockPost")}
          targetTitle={postTitle}
          onClose={() => setOpen(false)}
          onDone={() => setOpen(false)}
        />
      )}
    </>
  );
}
