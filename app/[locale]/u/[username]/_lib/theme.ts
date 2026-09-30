import type { ProfileTheme } from "@/types";

export type ThemeColors = {
  page: string;
  card: string;
  cardBorder: string;
  cardHover: string;
  /** 한 목록 안 줄 사이의 1px 선(cardBorder 는 테마에 따라 두께까지 들어 있어 따로 둔다). */
  divider: string;
  /** 목록 줄의 호버 바탕 — 카드처럼 떠오르지 않고 바탕만 바뀐다. */
  rowHover: string;
  primary: string;
  muted: string;
  avatar: string;
  avatarText: string;
  /** 주 버튼 — 테마의 강조색 한 가지(길찾기·신청·캘린더 추가·이메일 등록 등). */
  ctaPrimary: string;
  /** 대표 카드의 라벨 글자색 — 강조색. */
  accentText: string;
  /** 대표 카드 테두리 — 두께까지(모노는 2px). */
  accentBorder: string;
  /**
   * Hex value of the page background for the phone-preview surfaces (ShowcaseCard / ProfilePreview):
   * devices.css paints {@code .device .device-screen} black at a specificity Tailwind can't beat, so
   * the preview sets this inline.
   */
  pageBgHex: string;
};

/**
 * 테마 = 색 종이 한 장 + 강조색 하나. 페이지는 평평한 옅은 색(그라디언트·움직임·흐림·글로우 없음),
 * 카드는 흰 종이(다크·네온은 먹색), 테마의 색은 강조색(대표 카드·주 버튼·이니셜 원)으로만 드러난다.
 * 키는 백엔드 enum 그대로 — 저장된 테마를 옮기지 않는다.
 */
function paperTheme(o: {
  page: string;
  pageBgHex: string;
  line: string;
  cardHover: string;
  rowHover: string;
  accentText: string;
  accentBorder: string;
  cta: string;
  avatar: string;
}): ThemeColors {
  return {
    page: o.page,
    card: "bg-white",
    cardBorder: `border ${o.line}`,
    cardHover: o.cardHover,
    divider: o.line,
    rowHover: o.rowHover,
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: o.avatar,
    avatarText: "text-white",
    ctaPrimary: o.cta,
    accentText: o.accentText,
    accentBorder: o.accentBorder,
    pageBgHex: o.pageBgHex,
  };
}

export const THEME_TABLE: Record<ProfileTheme | "default", ThemeColors> = {
  default: paperTheme({
    page: "bg-white",
    pageBgHex: "#ffffff",
    line: "border-slate-200",
    cardHover: "hover:border-slate-300",
    rowHover: "hover:bg-slate-50",
    accentText: "text-accent-700",
    accentBorder: "border border-accent-300",
    cta: "bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-800",
    avatar: "bg-accent-700",
  }),
  light: paperTheme({
    page: "bg-slate-50",
    pageBgHex: "#f9faf9",
    line: "border-slate-200",
    cardHover: "hover:border-slate-300",
    rowHover: "hover:bg-slate-50",
    accentText: "text-slate-900",
    accentBorder: "border border-slate-400",
    cta: "bg-slate-900 text-white hover:bg-slate-700 active:bg-slate-700",
    avatar: "bg-slate-900",
  }),
  dark: {
    page: "bg-slate-950",
    card: "bg-slate-900",
    cardBorder: "border border-slate-800",
    cardHover: "hover:border-slate-700",
    divider: "border-slate-800",
    rowHover: "hover:bg-slate-800/60",
    primary: "text-slate-100",
    muted: "text-slate-400",
    avatar: "bg-accent-500",
    avatarText: "text-slate-950",
    ctaPrimary: "bg-accent-500 text-slate-950 hover:bg-accent-400 active:bg-accent-400",
    accentText: "text-accent-400",
    accentBorder: "border border-accent-500/40",
    pageBgHex: "#040906",
  },
  accent: paperTheme({
    page: "bg-accent-50",
    pageBgHex: "#ecfdf5",
    line: "border-accent-200",
    cardHover: "hover:border-accent-300",
    rowHover: "hover:bg-accent-50/60",
    accentText: "text-accent-700",
    accentBorder: "border border-accent-400",
    cta: "bg-accent-700 text-white hover:bg-accent-800 active:bg-accent-800",
    avatar: "bg-accent-700",
  }),
  sunset: paperTheme({
    page: "bg-rose-50",
    pageBgHex: "#fff1f2",
    line: "border-rose-200",
    cardHover: "hover:border-rose-300",
    rowHover: "hover:bg-rose-50/60",
    accentText: "text-rose-700",
    accentBorder: "border border-rose-300",
    cta: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-700",
    avatar: "bg-rose-600",
  }),
  ocean: paperTheme({
    page: "bg-sky-50",
    pageBgHex: "#f0f9ff",
    line: "border-sky-200",
    cardHover: "hover:border-sky-300",
    rowHover: "hover:bg-sky-50/60",
    accentText: "text-sky-700",
    accentBorder: "border border-sky-300",
    cta: "bg-sky-700 text-white hover:bg-sky-800 active:bg-sky-800",
    avatar: "bg-sky-700",
  }),
  forest: paperTheme({
    page: "bg-teal-50",
    pageBgHex: "#f0fdfa",
    line: "border-teal-200",
    cardHover: "hover:border-teal-300",
    rowHover: "hover:bg-teal-50/60",
    accentText: "text-teal-700",
    accentBorder: "border border-teal-300",
    cta: "bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-800",
    avatar: "bg-teal-700",
  }),
  mono: {
    page: "bg-white",
    card: "bg-white",
    cardBorder: "border-2 border-black",
    cardHover: "hover:bg-slate-50",
    divider: "border-black",
    rowHover: "hover:bg-slate-50",
    primary: "text-black",
    muted: "text-slate-700",
    avatar: "bg-black",
    avatarText: "text-white",
    ctaPrimary: "bg-black text-white hover:bg-slate-800 active:bg-slate-800",
    accentText: "text-black",
    accentBorder: "border-2 border-black",
    pageBgHex: "#ffffff",
  },
  neon: {
    page: "bg-slate-950",
    card: "bg-slate-900",
    cardBorder: "border border-fuchsia-500/40",
    cardHover: "hover:border-fuchsia-400",
    divider: "border-fuchsia-500/20",
    rowHover: "hover:bg-fuchsia-500/10",
    primary: "text-slate-100",
    muted: "text-slate-400",
    avatar: "bg-fuchsia-500",
    avatarText: "text-white",
    ctaPrimary: "bg-fuchsia-500 text-white hover:bg-fuchsia-400 active:bg-fuchsia-400",
    accentText: "text-fuchsia-300",
    accentBorder: "border border-fuchsia-400/60",
    pageBgHex: "#040906",
  },
  aurora: paperTheme({
    page: "bg-violet-50",
    pageBgHex: "#f5f3ff",
    line: "border-violet-200",
    cardHover: "hover:border-violet-300",
    rowHover: "hover:bg-violet-50/60",
    accentText: "text-violet-700",
    accentBorder: "border border-violet-300",
    cta: "bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-700",
    avatar: "bg-violet-600",
  }),
  wave: paperTheme({
    page: "bg-cyan-50",
    pageBgHex: "#ecfeff",
    line: "border-cyan-200",
    cardHover: "hover:border-cyan-300",
    rowHover: "hover:bg-cyan-50/60",
    accentText: "text-cyan-800",
    accentBorder: "border border-cyan-300",
    cta: "bg-cyan-700 text-white hover:bg-cyan-800 active:bg-cyan-800",
    avatar: "bg-cyan-700",
  }),
  ember: paperTheme({
    page: "bg-orange-50",
    pageBgHex: "#fff7ed",
    line: "border-orange-200",
    cardHover: "hover:border-orange-300",
    rowHover: "hover:bg-orange-50/60",
    accentText: "text-orange-700",
    accentBorder: "border border-orange-300",
    cta: "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-700",
    avatar: "bg-orange-600",
  }),
};
