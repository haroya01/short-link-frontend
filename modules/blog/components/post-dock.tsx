"use client";

import { useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn, inert } from "@/lib/utils";
import { useDockOffset } from "@/hooks/use-dock-offset";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { BookmarkButton } from "@/modules/blog/components/bookmark-button";
import { ConnectButton } from "@/modules/blog/components/connect-button";
import { dockButton } from "@/modules/blog/components/dock-button";
import { LikeButton } from "@/modules/blog/components/like-button";
import { TocSheet, type TocHeading } from "@/modules/blog/components/post-toc";
import { useDockedComposerOpen } from "@/modules/blog/lib/docked-composer";

const GAP = 12;

function usePastPostEnd(): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const end = document.querySelector("[data-post-end]");
    if (!end) return;
    let wasBelow = false;
    const observer = new IntersectionObserver(([entry]) => {
      const top = entry.boundingClientRect.top;
      const viewport = entry.rootBounds?.height ?? window.innerHeight;
      if (top >= viewport) wasBelow = true;
      setPast(top < 0 || (wasBelow && top < viewport));
    });
    observer.observe(end);
    return () => observer.disconnect();
  }, []);
  return past;
}

export function PostDock({
  postId,
  postTitle,
  likeCount,
  headings,
}: {
  postId: number;
  postTitle: string;
  likeCount: number;
  headings: TocHeading[];
}) {
  const t = useTranslations("publicPost");
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const offset = useDockOffset(true);
  const keyboard = useKeyboardInset();
  const composerOpen = useDockedComposerOpen();
  const pastEnd = usePastPostEnd();
  const withToc = headings.length >= 2;
  const away = !entered || keyboard > 0 || composerOpen || pastEnd;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      const height = el.getBoundingClientRect().height;
      if (height > 0) root.style.setProperty("--post-dock-h", `${Math.ceil(height) + GAP}px`);
      else root.style.removeProperty("--post-dock-h");
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--post-dock-h");
    };
  }, []);

  return (
    <>
      <div
        ref={ref}
        data-testid="post-dock"
        data-away={away || undefined}
        aria-hidden={away || undefined}
        {...inert(away)}
        style={offset > 0 ? { bottom: offset + GAP } : undefined}
        className={cn(
          "fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-center gap-3 transition-[bottom,opacity,transform] duration-300 ease-[var(--ease)] motion-reduce:transition-none min-[1100px]:hidden",
          away && "pointer-events-none translate-x-4 opacity-0",
        )}
      >
        {withToc && (
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            aria-label={t("toc")}
            aria-haspopup="dialog"
            className={dockButton()}
          >
            <List className="h-[18px] w-[18px]" aria-hidden />
          </button>
        )}
        <ConnectButton postId={postId} postTitle={postTitle} variant="dock" />
        <LikeButton postId={postId} initialCount={likeCount} postTitle={postTitle} variant="dock" />
        <BookmarkButton postId={postId} variant="dock" />
      </div>
      {withToc && <TocSheet headings={headings} open={tocOpen} onClose={() => setTocOpen(false)} />}
    </>
  );
}
