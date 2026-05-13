/**
 * Fixture profiles for the landing-page showcase carousel. Built in the same {@link PublicProfile}
 * shape the backend returns so the real {@link ProfileHeader} + {@link EntryList} renderers can be
 * dropped in directly — no parallel "mini" components, no design drift. Each profile covers a
 * different theme + archetype mix so the marquee demonstrates the product's range honestly.
 *
 * Images use picsum.photos with stable seeds — same URL → same image, no broken thumbnails on
 * reload + no S3 cost. If we ever want curated visuals we can swap in CDN URLs without changing
 * any renderer code.
 */
import type {
  ContactCardConfig,
  EmailFormConfig,
  EventConfig,
  GalleryConfig,
  PlaceConfig,
  ProductCardConfig,
  ProfileTheme,
  PublicProfile,
  PublicProfileEntry,
} from "@/types";

const img = (seed: string, w = 800, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const banner = (seed: string) => img(`banner-${seed}`, 1200, 400);
const avatar = (seed: string) => img(`avatar-${seed}`, 240, 240);

type EntryInput = {
  kind: PublicProfileEntry["kind"];
  id?: number;
  shortCode?: string;
  originalUrl?: string;
  ogTitle?: string;
  ogImage?: string;
  clickCount?: number;
  highlighted?: boolean;
  content?:
    | string
    | ContactCardConfig
    | PlaceConfig
    | GalleryConfig
    | ProductCardConfig
    | EventConfig
    | EmailFormConfig;
};

function entry(input: EntryInput, idx: number): PublicProfileEntry {
  return {
    kind: input.kind,
    id: input.id ?? idx + 1,
    shortCode: input.shortCode ?? null,
    shortUrl: input.shortCode ? `https://kurl.me/${input.shortCode}` : null,
    originalUrl: input.originalUrl ?? null,
    ogTitle: input.ogTitle ?? null,
    ogImage: input.ogImage ?? null,
    clickCount: input.clickCount ?? null,
    highlighted: input.highlighted ?? null,
    content:
      typeof input.content === "string"
        ? input.content
        : input.content
        ? JSON.stringify(input.content)
        : null,
  };
}

type ProfileSpec = {
  username: string;
  bio: string;
  theme: ProfileTheme;
  avatarSeed: string;
  bannerSeed: string;
  entries: EntryInput[];
};

const SPECS: ProfileSpec[] = [
  {
    username: "dohyun.coffee",
    bio: "성수동 골목 안 8석짜리 스페셜티 카페",
    theme: "sunset",
    avatarSeed: "dohyun-coffee",
    bannerSeed: "dohyun-coffee",
    entries: [
      {
        kind: "CONTACT_CARD",
        content: {
          name: "도현 커피",
          title: null,
          company: "도현 커피 · 성수",
          email: "hello@dohyun.coffee",
          phone: "02-1234-5678",
          address: "서울 성동구 성수이로 12",
          website: null,
          logoUrl: null,
          logoFocalX: 50,
          logoFocalY: 50,
          palette: "sunset",
        } satisfies ContactCardConfig,
      },
      {
        kind: "PLACE",
        content: {
          name: "도현 커피 성수 본점",
          address: "서울 성동구 성수이로 12",
          lat: 37.5447,
          lng: 127.0556,
          placeId: null,
          phone: "02-1234-5678",
          coverUrl: img("dohyun-place", 800, 500),
          category: "cafe",
          hoursText: "매일 08:00 – 21:00",
        } satisfies PlaceConfig,
      },
      {
        kind: "GALLERY",
        content: {
          images: [img("dohyun-1"), img("dohyun-2"), img("dohyun-3")],
        } satisfies GalleryConfig,
      },
    ],
  },
  {
    username: "haruka.dev",
    bio: "Backend engineer · open to freelance / consulting",
    theme: "mono",
    avatarSeed: "haruka",
    bannerSeed: "haruka",
    entries: [
      {
        kind: "CONTACT_CARD",
        content: {
          name: "Haruka",
          title: "Backend Engineer",
          company: "Freelance",
          email: "hi@haruka.dev",
          phone: null,
          address: null,
          website: "https://haruka.dev",
          logoUrl: null,
          logoFocalX: 50,
          logoFocalY: 50,
          palette: "midnight",
        } satisfies ContactCardConfig,
      },
      {
        kind: "LINK",
        shortCode: "hgh",
        originalUrl: "https://github.com/haruka",
        ogTitle: "GitHub · @haruka",
        ogImage: img("haruka-gh", 400, 300),
        clickCount: 124,
      },
      {
        kind: "LINK",
        shortCode: "hpf",
        originalUrl: "https://haruka.dev",
        ogTitle: "Portfolio · 2024 →",
        ogImage: img("haruka-pf", 400, 300),
        clickCount: 86,
        highlighted: true,
      },
    ],
  },
  {
    username: "yoga.minji",
    bio: "5년차 빈야사 인스트럭터 · 주 3 회 클래스",
    theme: "forest",
    avatarSeed: "minji",
    bannerSeed: "minji",
    entries: [
      {
        kind: "EVENT",
        content: {
          title: "주말 빈야사 워크샵",
          startsAt: "2026-05-18T10:00:00+09:00",
          endsAt: "2026-05-18T12:00:00+09:00",
          location: "을지로 5층 스튜디오",
          description: "전 레벨 환영 · 매트는 준비돼 있어요.",
          url: null,
        } satisfies EventConfig,
      },
      {
        kind: "LINK",
        shortCode: "ymj1",
        originalUrl: "https://example.com/booking",
        ogTitle: "1:1 클래스 예약",
        ogImage: img("minji-booking", 400, 300),
        clickCount: 42,
        highlighted: true,
      },
      {
        kind: "GALLERY",
        content: {
          images: [img("minji-1"), img("minji-2"), img("minji-3"), img("minji-4")],
        } satisfies GalleryConfig,
      },
    ],
  },
  {
    username: "shotby.sora",
    bio: "Film photography · 35mm only",
    theme: "ocean",
    avatarSeed: "sora",
    bannerSeed: "sora",
    entries: [
      {
        kind: "GALLERY",
        content: {
          images: [
            img("sora-1"),
            img("sora-2"),
            img("sora-3"),
            img("sora-4"),
            img("sora-5"),
            img("sora-6"),
          ],
        } satisfies GalleryConfig,
      },
      {
        kind: "LINK",
        shortCode: "soig",
        originalUrl: "https://instagram.com/shotby.sora",
        ogTitle: "Instagram @shotby.sora",
        ogImage: img("sora-ig", 400, 300),
        clickCount: 312,
      },
      {
        kind: "LINK",
        shortCode: "soct",
        originalUrl: "mailto:sora@shotby.com",
        ogTitle: "촬영 문의하기",
        ogImage: img("sora-ct", 400, 300),
        highlighted: true,
      },
    ],
  },
  {
    username: "moon.studio",
    bio: "월 1 회 신상 드롭 · 작은 굿즈 스튜디오",
    theme: "aurora",
    avatarSeed: "moon",
    bannerSeed: "moon",
    entries: [
      {
        kind: "PRODUCT_CARD",
        content: {
          title: "여름 신상",
          layout: "carousel",
          items: [
            {
              name: "Linen Tote",
              images: [{ url: img("moon-tote", 600, 600), focalX: 50, focalY: 50 }],
              price: "₩28,000",
              originalPrice: null,
              description: null,
              ctaLabel: null,
              ctaUrl: null,
              badge: "NEW",
            },
            {
              name: "Moon Ceramic Mug",
              images: [{ url: img("moon-mug", 600, 600), focalX: 50, focalY: 50 }],
              price: "₩22,000",
              originalPrice: null,
              description: null,
              ctaLabel: null,
              ctaUrl: null,
              badge: "BEST",
            },
            {
              name: "Brass Bookmark",
              images: [{ url: img("moon-mark", 600, 600), focalX: 50, focalY: 50 }],
              price: "₩9,000",
              originalPrice: null,
              description: null,
              ctaLabel: null,
              ctaUrl: null,
              badge: null,
            },
          ],
        } satisfies ProductCardConfig,
      },
      {
        kind: "EMAIL_FORM",
        content: {
          title: "드롭 알림 받기",
          subtitle: "월 1 회, 신상 드롭 전날 메일 1 통.",
          placeholder: "you@example.com",
          successMessage: "고마워요! 다음 드롭 때 만나요.",
        } satisfies EmailFormConfig,
      },
    ],
  },
  {
    username: "kazuki.dj",
    bio: "House / Techno · Tokyo-based",
    theme: "neon",
    avatarSeed: "kazuki",
    bannerSeed: "kazuki",
    entries: [
      {
        kind: "EMBED",
        content: "https://soundcloud.com/example/latest-mix-april-2026",
      },
      {
        kind: "EVENT",
        content: {
          title: "Vent Tokyo",
          startsAt: "2026-05-24T23:00:00+09:00",
          endsAt: "2026-05-25T05:00:00+09:00",
          location: "Aoyama · Vent",
          description: null,
          url: null,
        } satisfies EventConfig,
      },
      {
        kind: "LINK",
        shortCode: "ksp",
        originalUrl: "https://open.spotify.com/artist/example",
        ogTitle: "Spotify Artist",
        ogImage: img("kazuki-sp", 400, 300),
        clickCount: 218,
      },
    ],
  },
];

export const SHOWCASE_PROFILES: PublicProfile[] = SPECS.map((spec) => ({
  username: spec.username,
  bio: spec.bio,
  theme: spec.theme,
  avatarUrl: avatar(spec.avatarSeed),
  bannerUrl: banner(spec.bannerSeed),
  socials: [],
  entries: spec.entries.map((e, i) => entry(e, i)),
}));
