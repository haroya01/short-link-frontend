import type { ReactNode } from "react";

type Position = "top-left" | "top-right";

type Props = {
  position: Position;
  /** Optional leading icon — sized at h-3 w-3 to match floating-chip rules in AGENTS.md §1. */
  icon?: ReactNode;
  children: ReactNode;
};

/**
 * Floating chip rendered over a Visual-first card's hero (cover photo / map / OG image). Sits at
 * the top-left for primary signals (Featured / business status / 영업중) and at the top-right for
 * secondary metadata (category / tag). Used by LinkEntry highlighted variant, PlaceEntry, and any
 * future Visual-first card that wants the same affordance.
 *
 * <p>Dark glass surface (`bg-black/60 backdrop-blur-sm`) reads consistently across the photo's
 * own color palette — a light chip would disappear over bright shots. AGENTS.md §4 calls this out
 * as the standard for floating pills.
 */
export function CardFloatingChip({ position, icon, children }: Props) {
  const positionClass = position === "top-left" ? "left-3 top-3" : "right-3 top-3";
  return (
    <span
      className={`absolute ${positionClass} inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm`}
    >
      {icon}
      {children}
    </span>
  );
}
