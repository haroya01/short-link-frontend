"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { askToSignIn } from "@/components/auth/login-prompt";
import { ConnectSheet } from "@/modules/blog/components/connect-sheet";
import { dockButton } from "@/modules/blog/components/dock-button";
import { ACTION_ICON, actionIconButton } from "@/modules/blog/components/action-icon-button";

/**
 * "연결" — connect the whole post to a collection or PATH, at the same rank as 공감/저장. The verb
 * (connect, not broadcast) is a first-class post action so a reader can weave the post into a path
 * the moment they finish it, without leaving the article. Opening the sheet requires an account —
 * an anonymous click starts the login flow, the same gate as the like/bookmark buttons — because a
 * connection is authored per user. The sheet itself (pick collection → the one-line 왜) is the shared
 * ConnectSheet already used on highlights; here it just targets the post block.
 */
export function ConnectButton({
  postId,
  postTitle,
  variant = "icon",
}: {
  postId: number;
  postTitle: string;
  variant?: "icon" | "dock";
}) {
  const t = useTranslations("publicPost");
  const tc = useTranslations("collections");
  const { authenticated } = useAuth();
  // Pop the icon only on a real click, matching the like/bookmark gate (never on mount).
  const [interacted, setInteracted] = useState(false);
  const [open, setOpen] = useState(false);

  function onClick() {
    setInteracted(true);
    if (!authenticated) {
      askToSignIn("collect");
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
        title={variant === "icon" ? tc("connectLabel") : undefined}
        className={variant === "dock" ? dockButton() : actionIconButton()}
      >
        <span className={`inline-flex ${interacted ? "subscribe-pop" : ""}`}>
          <Link2 className={ACTION_ICON} />
        </span>
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
