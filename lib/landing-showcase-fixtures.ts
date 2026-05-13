/**
 * Fixture profile data for the landing-page profile showcase carousel. These are not real users
 * — they're curated examples that cover the 4 archetype categories (Visual-first / Action /
 * Information / Identity) and the major ProfileEntry kinds, so a non-logged-in visitor sees
 * concretely "this is the kind of page kurl makes" within the first scroll.
 *
 * Kept deliberately small (avatar URLs as data URIs are forbidden — use unsplash thumbnail-
 * grade CDN URLs sparingly) and self-contained so a backend outage never breaks the landing.
 */

import type { ProfileTheme } from "@/types";

export type ShowcaseEntry =
  | { kind: "bio"; text: string }
  | { kind: "link"; label: string; href: string }
  | { kind: "highlight"; label: string; href: string }
  | { kind: "place"; name: string; address: string; coverColor: string }
  | { kind: "product"; title: string; price: string; coverColor: string }
  | { kind: "event"; title: string; date: string; location: string }
  | { kind: "embed"; provider: "youtube" | "soundcloud" | "spotify"; title: string }
  | { kind: "gallery"; colors: [string, string, string] }
  | { kind: "contact"; title: string; company: string };

export type ShowcaseProfile = {
  handle: string;
  displayName: string;
  bio: string;
  theme: ProfileTheme;
  bannerColor: string;
  avatarSeed: string;
  entries: ShowcaseEntry[];
};

export const SHOWCASE_PROFILES: ShowcaseProfile[] = [
  {
    handle: "dohyun.coffee",
    displayName: "도현 커피",
    bio: "성수동 골목 안 8석짜리 스페셜티 카페",
    theme: "sunset",
    bannerColor: "linear-gradient(135deg, #fed7aa 0%, #fdba74 60%, #fb923c 100%)",
    avatarSeed: "DH",
    entries: [
      { kind: "place", name: "성수 본점", address: "서울 성동구 성수이로 12", coverColor: "#fb923c" },
      { kind: "gallery", colors: ["#fed7aa", "#fdba74", "#fb923c"] },
      { kind: "highlight", label: "메뉴 보기", href: "#" },
    ],
  },
  {
    handle: "haruka.dev",
    displayName: "@haruka.dev",
    bio: "Backend engineer · open to freelance / consulting",
    theme: "mono",
    bannerColor: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)",
    avatarSeed: "H",
    entries: [
      { kind: "contact", title: "Engineer", company: "Freelance" },
      { kind: "link", label: "GitHub", href: "#" },
      { kind: "link", label: "Portfolio (2024 →)", href: "#" },
      { kind: "highlight", label: "프로젝트 의뢰하기", href: "#" },
    ],
  },
  {
    handle: "yoga.minji",
    displayName: "민지 요가",
    bio: "5년차 빈야사 인스트럭터 · 주 3회 클래스 진행",
    theme: "forest",
    bannerColor: "linear-gradient(135deg, #bbf7d0 0%, #86efac 60%, #4ade80 100%)",
    avatarSeed: "MJ",
    entries: [
      { kind: "event", title: "주말 빈야사 워크샵", date: "5월 18일 토 10:00", location: "을지로" },
      { kind: "highlight", label: "1:1 클래스 예약", href: "#" },
      { kind: "gallery", colors: ["#bbf7d0", "#86efac", "#4ade80"] },
    ],
  },
  {
    handle: "shotby.sora",
    displayName: "Sora Shoots",
    bio: "Film photography · 35mm only",
    theme: "ocean",
    bannerColor: "linear-gradient(135deg, #bae6fd 0%, #7dd3fc 60%, #38bdf8 100%)",
    avatarSeed: "S",
    entries: [
      { kind: "gallery", colors: ["#bae6fd", "#7dd3fc", "#0ea5e9"] },
      { kind: "link", label: "Instagram @shotby.sora", href: "#" },
      { kind: "highlight", label: "촬영 문의하기", href: "#" },
    ],
  },
  {
    handle: "moon.studio",
    displayName: "Moon Studio",
    bio: "월 1회 신상 드롭하는 작은 굿즈 스튜디오",
    theme: "aurora",
    bannerColor: "linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 50%, #818cf8 100%)",
    avatarSeed: "🌙",
    entries: [
      { kind: "product", title: "여름 한정 — Linen Tote", price: "₩28,000", coverColor: "#818cf8" },
      { kind: "product", title: "Moon Ceramic Mug", price: "₩22,000", coverColor: "#a5b4fc" },
      { kind: "highlight", label: "이메일로 드롭 알림 받기", href: "#" },
    ],
  },
  {
    handle: "kazuki.dj",
    displayName: "Kazuki",
    bio: "House / Techno · Tokyo-based",
    theme: "neon",
    bannerColor: "linear-gradient(135deg, #1e1b4b 0%, #a855f7 50%, #f472b6 100%)",
    avatarSeed: "K",
    entries: [
      { kind: "embed", provider: "soundcloud", title: "Latest Mix · April 2026" },
      { kind: "event", title: "Vent Tokyo", date: "5월 24일 금 23:00", location: "Aoyama" },
      { kind: "link", label: "Spotify Artist", href: "#" },
    ],
  },
];
