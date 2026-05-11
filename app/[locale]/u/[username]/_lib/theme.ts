import type { ProfileTheme } from "@/types";

export type ThemeColors = {
  page: string;
  card: string;
  cardBorder: string;
  cardHover: string;
  primary: string;
  muted: string;
  avatar: string;
  avatarText: string;
};

/**
 * Tailwind class lookup keyed by the user's saved theme. The default fallback (when a user hasn't
 * picked one) matches "light" so the page never renders without colors.
 */
export const THEME_TABLE: Record<ProfileTheme | "default", ThemeColors> = {
  default: {
    page: "bg-white",
    card: "bg-white",
    cardBorder: "border-slate-200",
    cardHover: "hover:border-slate-300 hover:bg-slate-50",
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: "bg-slate-900",
    avatarText: "text-white",
  },
  light: {
    page: "bg-slate-50",
    card: "bg-white",
    cardBorder: "border-slate-200",
    cardHover: "hover:border-slate-300 hover:bg-slate-50",
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: "bg-slate-900",
    avatarText: "text-white",
  },
  dark: {
    page: "bg-slate-950",
    card: "bg-slate-900",
    cardBorder: "border-slate-800",
    cardHover: "hover:border-slate-700 hover:bg-slate-800",
    primary: "text-slate-100",
    muted: "text-slate-400",
    avatar: "bg-slate-100",
    avatarText: "text-slate-900",
  },
  accent: {
    page: "bg-gradient-to-b from-accent-50 to-white",
    card: "bg-white",
    cardBorder: "border-accent-200",
    cardHover: "hover:border-accent-300 hover:bg-accent-50/50",
    primary: "text-slate-900",
    muted: "text-slate-600",
    avatar: "bg-accent-600",
    avatarText: "text-white",
  },
  sunset: {
    page: "bg-gradient-to-b from-orange-100 via-rose-50 to-amber-50",
    card: "bg-white/90 backdrop-blur-sm",
    cardBorder: "border-rose-200",
    cardHover: "hover:border-rose-300 hover:bg-white",
    primary: "text-slate-900",
    muted: "text-rose-900/70",
    avatar: "bg-gradient-to-br from-orange-400 to-rose-500",
    avatarText: "text-white",
  },
  ocean: {
    page: "bg-gradient-to-b from-sky-100 via-cyan-50 to-blue-50",
    card: "bg-white/90 backdrop-blur-sm",
    cardBorder: "border-sky-200",
    cardHover: "hover:border-sky-300 hover:bg-white",
    primary: "text-slate-900",
    muted: "text-sky-900/70",
    avatar: "bg-gradient-to-br from-cyan-500 to-sky-600",
    avatarText: "text-white",
  },
  forest: {
    page: "bg-gradient-to-b from-emerald-100 via-green-50 to-teal-50",
    card: "bg-white/90 backdrop-blur-sm",
    cardBorder: "border-emerald-200",
    cardHover: "hover:border-emerald-300 hover:bg-white",
    primary: "text-slate-900",
    muted: "text-emerald-900/70",
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-600",
    avatarText: "text-white",
  },
  mono: {
    page: "bg-white",
    card: "bg-white",
    cardBorder: "border-2 border-black",
    cardHover: "hover:bg-black hover:text-white",
    primary: "text-black",
    muted: "text-slate-700",
    avatar: "bg-black",
    avatarText: "text-white",
  },
  neon: {
    page: "bg-slate-950",
    card: "bg-slate-900/80 backdrop-blur-sm",
    cardBorder: "border border-fuchsia-500/40",
    cardHover: "hover:border-fuchsia-400 hover:shadow-[0_0_30px_rgba(232,121,249,0.25)]",
    primary: "text-fuchsia-100",
    muted: "text-fuchsia-300/70",
    avatar: "bg-gradient-to-br from-fuchsia-500 to-cyan-400",
    avatarText: "text-slate-950",
  },
  aurora: {
    // Animated gradient (defined in globals.css with prefers-reduced-motion fallback).
    page: "theme-aurora-anim",
    card: "bg-white/85 backdrop-blur-sm",
    cardBorder: "border border-violet-200",
    cardHover: "hover:bg-white hover:border-violet-300",
    primary: "text-slate-900",
    muted: "text-slate-600",
    avatar: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    avatarText: "text-white",
  },
  wave: {
    // Animated vertical wave (sky → cyan → deep ocean). See .theme-wave-anim in globals.css.
    page: "theme-wave-anim",
    card: "bg-white/85 backdrop-blur-sm",
    cardBorder: "border border-sky-200",
    cardHover: "hover:bg-white hover:border-sky-300",
    primary: "text-slate-900",
    muted: "text-sky-900/70",
    avatar: "bg-gradient-to-br from-sky-500 to-cyan-500",
    avatarText: "text-white",
  },
  ember: {
    // Animated warm flicker (amber → orange → crimson). See .theme-ember-anim in globals.css.
    page: "theme-ember-anim",
    card: "bg-white/85 backdrop-blur-sm",
    cardBorder: "border border-orange-200",
    cardHover: "hover:bg-white hover:border-orange-300",
    primary: "text-slate-900",
    muted: "text-orange-900/70",
    avatar: "bg-gradient-to-br from-amber-500 to-rose-600",
    avatarText: "text-white",
  },
};
