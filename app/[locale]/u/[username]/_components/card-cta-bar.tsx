import { ArrowRight } from "lucide-react";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  href: string;
  label: string;
  colors: ThemeColors;
  /**
   * Optional click handler — used by ProductCardEntry to trigger {@code navigator.vibrate} on tap
   * (haptic feedback on mobile). The wrapper is always an {@code <a>} so we don't strip the
   * native browser middle-click / cmd-click / right-click affordances by routing through a
   * button + onClick.
   */
  onClick?: () => void;
  /** Set to false when the link shouldn't open in a new tab (rare). Defaults to true. */
  external?: boolean;
};

/**
 * Standard bottom CTA bar for Visual-first cards that need a single primary action (ProductCardEntry
 * "자세히", BookingEntry "예약하기"). Sits inside the card with a top border, left-aligned label,
 * and an {@code ArrowRight} marker on the right. The marker uses {@code group-hover:translate-x-0.5}
 * for the forward-motion micro-interaction that signals "this opens a new page".
 *
 * <p>Per AGENTS.md §4 the bar is fixed at {@code px-4 py-2.5} — paired with {@code text-[13px]
 * font-medium} for the CTA-tier typography step (smaller than card titles, larger than meta).
 */
export function CardCtaBar({ href, label, colors, onClick, external = true }: Props) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      onClick={onClick}
      className={`group flex items-center justify-between border-t px-4 py-2.5 text-[13px] font-medium transition active:scale-[0.99] ${colors.cardBorder} ${colors.primary} ${colors.cardHover}`}
    >
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
    </a>
  );
}
