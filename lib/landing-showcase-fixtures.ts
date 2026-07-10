/**
 * Fixture profiles for the landing-page showcase carousel. Built in the same {@link PublicProfile}
 * shape the backend returns so the real {@link ProfileHeader} + {@link EntryList} renderers can be
 * dropped in directly — what visitors see in the showcase is renderable with the same fields any
 * signed-up user can fill in via the editor. No exclusive features, no fields the editor doesn't
 * expose, no marketing-only flourishes.
 *
 * Images are self-hosted under {@code public/showcase/<id>.jpg} (originally sourced from Unsplash
 * but frozen as static assets so a photographer pulling a photo can't break the landing page).
 * Each id encodes the persona context — cafe shots for the cafe owner, yoga shots for the yoga
 * instructor, etc.
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

// Showcase images are self-hosted under `public/showcase/<id>.jpg`. Originally we hot-linked
// Unsplash via `images.unsplash.com/photo-<id>` but a photographer pulled one of the photos
// (id 1571266028253... — dj turntable) and our cards 404'd. Self-hosting freezes the asset:
// once it's in the public/ tree it can't disappear out from under us, and Vercel serves it
// from the same edge as everything else. Crop sizes from the old `unsplash(id, w, h)` helper
// are dropped here because browsers downscale a single 1200×900 JPEG to whatever the card
// renders at — the bandwidth delta is small (~3.4 MB total across 24 images) and we don't
// need responsive variants for an above-the-fold marquee.
const local = (id: string) => `/showcase/${id}.jpg`;

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
  avatarPhotoId: string;
  bannerPhotoId: string;
  entries: EntryInput[];
};

const SPECS: ProfileSpec[] = [
  {
    username: "dohyun.coffee",
    bio: "성수동 골목 안 8석짜리 스페셜티 카페",
    theme: "sunset",
    bannerPhotoId: "1559925393-8be0ec4767c8", // espresso machine / cafe interior
    avatarPhotoId: "1495474472287-4d71bcdd2085", // latte top-down
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
          coverUrl: local("1559925393-8be0ec4767c8"),
          category: "cafe",
          hoursText: "매일 08:00 – 21:00",
        } satisfies PlaceConfig,
      },
      {
        kind: "GALLERY",
        content: {
          images: [
            local("1495474472287-4d71bcdd2085"),
            local("1509042239860-f550ce710b93"),
            local("1442975631115-c4f7b05b8a2c"),
          ],
        } satisfies GalleryConfig,
      },
    ],
  },
  {
    username: "haruka.dev",
    bio: "Backend engineer · open to freelance / consulting",
    theme: "mono",
    bannerPhotoId: "1517694712202-14dd9538aa97", // mech keyboard
    avatarPhotoId: "1555066931-4365d14bab8c", // code screen
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
        ogImage: local("1556075798-4825dfaaf498"),
        clickCount: 124,
      },
      {
        kind: "LINK",
        shortCode: "hpf",
        originalUrl: "https://haruka.dev",
        ogTitle: "Portfolio · 2024 →",
        ogImage: local("1517694712202-14dd9538aa97"),
        clickCount: 86,
        highlighted: true,
      },
    ],
  },
  {
    username: "yoga.minji",
    bio: "5년차 빈야사 인스트럭터 · 주 3 회 클래스",
    theme: "forest",
    bannerPhotoId: "1544367567-0f2fcb009e0b", // yoga studio
    avatarPhotoId: "1599901860904-17e6ed7083a0", // yoga pose
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
        ogImage: local("1544367567-0f2fcb009e0b"),
        clickCount: 42,
        highlighted: true,
      },
      {
        kind: "GALLERY",
        content: {
          images: [
            local("1544367567-0f2fcb009e0b"),
            local("1599901860904-17e6ed7083a0"),
            local("1593810451137-5dc55105dace"),
            local("1545389336-cf090694435e"),
          ],
        } satisfies GalleryConfig,
      },
    ],
  },
  {
    username: "shotby.sora",
    bio: "Film photography · 35mm only",
    theme: "ocean",
    bannerPhotoId: "1452587925148-ce544e77e70d", // film camera
    avatarPhotoId: "1500530855697-b586d89ba3ee", // camera close
    entries: [
      {
        kind: "GALLERY",
        content: {
          images: [
            local("1500530855697-b586d89ba3ee"),
            local("1452587925148-ce544e77e70d"),
            local("1502920917128-1aa500764cbd"),
            local("1487611459768-bd414656ea10"),
            local("1426604966848-d7adac402bff"),
            local("1503023345310-bd7c1de61c7d"),
          ],
        } satisfies GalleryConfig,
      },
      {
        kind: "LINK",
        shortCode: "soig",
        originalUrl: "https://instagram.com/shotby.sora",
        ogTitle: "Instagram @shotby.sora",
        ogImage: local("1500530855697-b586d89ba3ee"),
        clickCount: 312,
      },
      {
        kind: "LINK",
        shortCode: "soct",
        originalUrl: "mailto:sora@shotby.com",
        ogTitle: "촬영 문의하기",
        ogImage: local("1452587925148-ce544e77e70d"),
        highlighted: true,
      },
    ],
  },
  {
    username: "moon.studio",
    bio: "월 1 회 신상 드롭 · 작은 굿즈 스튜디오",
    theme: "aurora",
    bannerPhotoId: "1556228720-195a672e8a03", // minimal product flatlay
    avatarPhotoId: "1567696911980-2eed69a46042", // ceramic mug
    entries: [
      {
        kind: "PRODUCT_CARD",
        content: {
          title: "여름 신상",
          layout: "carousel",
          items: [
            {
              name: "Linen Tote",
              images: [
                {
                  url: local("1591561954557-26941169b49e"),
                  focalX: 50,
                  focalY: 50,
                },
              ],
              price: "₩28,000",
              originalPrice: null,
              description: null,
              ctaLabel: null,
              ctaUrl: null,
              badge: "NEW",
            },
            {
              name: "Moon Ceramic Mug",
              images: [
                {
                  url: local("1567696911980-2eed69a46042"),
                  focalX: 50,
                  focalY: 50,
                },
              ],
              price: "₩22,000",
              originalPrice: null,
              description: null,
              ctaLabel: null,
              ctaUrl: null,
              badge: "BEST",
            },
            {
              name: "Brass Bookmark",
              images: [
                {
                  url: local("1532153975070-2e9ab71f1b14"),
                  focalX: 50,
                  focalY: 50,
                },
              ],
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
    // Pure link-share profile — the main use case ("Instagram bio · 한 링크 안에 모든 것"). No
    // PLACE / CONTACT_CARD / GALLERY / EMAIL_FORM noise; just LINK entries with click-count
    // chips so the visitor reads it as a Linktree-style bio link.
    username: "min.links",
    bio: "All my work in one tap.",
    theme: "light",
    // All photo IDs verified present in public/showcase/. Previous round used a guessed banner
    // ID that 404'd, leaving the <img> empty — the visible "black background" on the showcase
    // detail page was the broken image element, not the theme.
    bannerPhotoId: "1487611459768-bd414656ea10",
    avatarPhotoId: "1555066931-4365d14bab8c",
    entries: [
      {
        kind: "LINK",
        shortCode: "port",
        originalUrl: "https://example.com/portfolio",
        ogTitle: "Portfolio",
        ogImage: local("1487611459768-bd414656ea10"),
        clickCount: 124,
      },
      {
        kind: "LINK",
        shortCode: "code",
        originalUrl: "https://github.com/example",
        ogTitle: "GitHub",
        ogImage: local("1517694712202-14dd9538aa97"),
        clickCount: 78,
      },
      {
        kind: "LINK",
        shortCode: "wri",
        originalUrl: "https://medium.com/@example",
        ogTitle: "Writing on Medium",
        ogImage: local("1555066931-4365d14bab8c"),
        clickCount: 56,
      },
      {
        kind: "LINK",
        shortCode: "lkin",
        originalUrl: "https://linkedin.com/in/example",
        ogTitle: "LinkedIn",
        ogImage: local("1545389336-cf090694435e"),
        clickCount: 89,
      },
    ],
  },
  {
    username: "kazuki.dj",
    bio: "House / Techno · Tokyo-based",
    theme: "neon",
    bannerPhotoId: "1518609878373-06d740f60d8b", // dj booth — replaces previously broken id
    avatarPhotoId: "1493225457124-a3eb161ffa5f", // vinyl
    // EMBED removed — the showcase shouldn't reference SoundCloud URLs that don't exist. Other
    // fixtures cover the major entry kinds; this persona showcases EVENT + LINK + GALLERY.
    entries: [
      {
        kind: "GALLERY",
        content: {
          images: [
            local("1518609878373-06d740f60d8b"),
            local("1493225457124-a3eb161ffa5f"),
            local("1470225620780-dba8ba36b745"),
          ],
        } satisfies GalleryConfig,
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
        ogImage: local("1493225457124-a3eb161ffa5f"),
        clickCount: 218,
      },
    ],
  },
];

export const SHOWCASE_PROFILES: PublicProfile[] = SPECS.map((spec) => ({
  username: spec.username,
  bio: spec.bio,
  theme: spec.theme,
  avatarUrl: local(spec.avatarPhotoId),
  bannerUrl: local(spec.bannerPhotoId),
  socials: [],
  publishedPostCount: 0,
  hideFollowerCount: false,
  entries: spec.entries.map((e, i) => entry(e, i)),
}));
