/**
 * Fixture profiles for the landing-page showcase carousel. Built in the same {@link PublicProfile}
 * shape the backend returns so the real {@link ProfileHeader} + {@link EntryList} renderers can be
 * dropped in directly — what visitors see in the showcase is renderable with the same fields any
 * signed-up user can fill in via the editor. No exclusive features, no fields the editor doesn't
 * expose, no marketing-only flourishes.
 *
 * Images use Unsplash with stable photo ids curated per persona — cafe shots for the cafe owner,
 * yoga shots for the yoga instructor, etc. — so the visual context matches the persona instead of
 * the random landscapes picsum.photos returns.
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

// Unsplash photo-id URLs. Photo ids are immutable so these URLs never break or shift content.
// Crop params come from Unsplash's image CDN: `?w=&h=&fit=crop` produces a center-crop at the
// requested size, cached at the edge.
const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;

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
          coverUrl: unsplash("1559925393-8be0ec4767c8", 800, 500),
          category: "cafe",
          hoursText: "매일 08:00 – 21:00",
        } satisfies PlaceConfig,
      },
      {
        kind: "GALLERY",
        content: {
          images: [
            unsplash("1495474472287-4d71bcdd2085", 800, 600),
            unsplash("1509042239860-f550ce710b93", 800, 600),
            unsplash("1442975631115-c4f7b05b8a2c", 800, 600),
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
        ogImage: unsplash("1556075798-4825dfaaf498", 400, 300),
        clickCount: 124,
      },
      {
        kind: "LINK",
        shortCode: "hpf",
        originalUrl: "https://haruka.dev",
        ogTitle: "Portfolio · 2024 →",
        ogImage: unsplash("1517694712202-14dd9538aa97", 400, 300),
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
        ogImage: unsplash("1544367567-0f2fcb009e0b", 400, 300),
        clickCount: 42,
        highlighted: true,
      },
      {
        kind: "GALLERY",
        content: {
          images: [
            unsplash("1544367567-0f2fcb009e0b", 800, 600),
            unsplash("1599901860904-17e6ed7083a0", 800, 600),
            unsplash("1593810451137-5dc55105dace", 800, 600),
            unsplash("1545389336-cf090694435e", 800, 600),
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
            unsplash("1500530855697-b586d89ba3ee", 800, 600),
            unsplash("1452587925148-ce544e77e70d", 800, 600),
            unsplash("1502920917128-1aa500764cbd", 800, 600),
            unsplash("1485631906441-91f54180c1f9", 800, 600),
            unsplash("1426604966848-d7adac402bff", 800, 600),
            unsplash("1503023345310-bd7c1de61c7d", 800, 600),
          ],
        } satisfies GalleryConfig,
      },
      {
        kind: "LINK",
        shortCode: "soig",
        originalUrl: "https://instagram.com/shotby.sora",
        ogTitle: "Instagram @shotby.sora",
        ogImage: unsplash("1500530855697-b586d89ba3ee", 400, 300),
        clickCount: 312,
      },
      {
        kind: "LINK",
        shortCode: "soct",
        originalUrl: "mailto:sora@shotby.com",
        ogTitle: "촬영 문의하기",
        ogImage: unsplash("1452587925148-ce544e77e70d", 400, 300),
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
                  url: unsplash("1591561954557-26941169b49e", 600, 600),
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
                  url: unsplash("1567696911980-2eed69a46042", 600, 600),
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
                  url: unsplash("1532153975070-2e9ab71f1b14", 600, 600),
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
            unsplash("1518609878373-06d740f60d8b", 800, 600),
            unsplash("1493225457124-a3eb161ffa5f", 800, 600),
            unsplash("1470225620780-dba8ba36b745", 800, 600),
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
        ogImage: unsplash("1493225457124-a3eb161ffa5f", 400, 300),
        clickCount: 218,
      },
    ],
  },
];

export const SHOWCASE_PROFILES: PublicProfile[] = SPECS.map((spec) => ({
  username: spec.username,
  bio: spec.bio,
  theme: spec.theme,
  avatarUrl: unsplash(spec.avatarPhotoId, 240, 240),
  bannerUrl: unsplash(spec.bannerPhotoId, 1200, 400),
  socials: [],
  entries: spec.entries.map((e, i) => entry(e, i)),
}));
