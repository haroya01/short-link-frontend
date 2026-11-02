export type LinkTemplate = {
  id: string;
  label: string;
  urlTemplate: string;
  placeholder: string;
  /**
   * Single capture-group regex used in two directions: to pull the handle out of an existing URL
   * (so "github.com/haroya" + Instagram chip → "instagram.com/haroya"), and to detect "what
   * platform is this URL on" for chip-to-chip swaps.
   */
  handleRegex: RegExp;
};

const TEMPLATES = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    urlTemplate: "https://instagram.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?instagram\.com\/([^/?#]+)/i,
  },
  x: {
    id: "x",
    label: "X",
    urlTemplate: "https://x.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)/i,
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    urlTemplate: "https://youtube.com/@{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?youtube\.com\/@?([^/?#]+)/i,
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    urlTemplate: "https://tiktok.com/@{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?tiktok\.com\/@([^/?#]+)/i,
  },
  github: {
    id: "github",
    label: "GitHub",
    urlTemplate: "https://github.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)/i,
  },
  kakao: {
    id: "kakao",
    label: "카카오톡 채널",
    urlTemplate: "https://pf.kakao.com/_{h}",
    placeholder: "abcDEF",
    handleRegex: /^https?:\/\/pf\.kakao\.com\/_([^/?#]+)/i,
  },
  naverBlog: {
    id: "naver-blog",
    label: "네이버 블로그",
    urlTemplate: "https://blog.naver.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/blog\.naver\.com\/([^/?#]+)/i,
  },
  velog: {
    id: "velog",
    label: "Velog",
    urlTemplate: "https://velog.io/@{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/velog\.io\/@([^/?#]+)/i,
  },
  note: {
    id: "note",
    label: "note",
    urlTemplate: "https://note.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?note\.com\/([^/?#]+)/i,
  },
  hatenaBlog: {
    id: "hatena-blog",
    label: "はてなブログ",
    urlTemplate: "https://{h}.hatenablog.com",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?!www\.)([a-z0-9-]+)\.(?:hatenablog\.(?:com|jp)|hateblo\.jp)(?:[/?#]|$)/i,
  },
  ameblo: {
    id: "ameblo",
    label: "アメブロ",
    urlTemplate: "https://ameblo.jp/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.|s\.)?ameblo\.jp\/([^/?#]+)/i,
  },
  pixiv: {
    id: "pixiv",
    label: "pixiv",
    urlTemplate: "https://www.pixiv.net/users/{h}",
    placeholder: "12345678",
    handleRegex: /^https?:\/\/(?:www\.)?pixiv\.net\/(?:en\/)?users\/(\d+)/i,
  },
  booth: {
    id: "booth",
    label: "BOOTH",
    urlTemplate: "https://{h}.booth.pm",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?!www\.)([a-z0-9-]+)\.booth\.pm(?:[/?#]|$)/i,
  },
  // Email is a special case — we don't show the technical "mailto:" prefix in the field; the
  // input is just an address and we add the scheme on submit (see normalizeScheme).
  email: {
    id: "email",
    label: "Email",
    urlTemplate: "{h}",
    placeholder: "you@example.com",
    handleRegex: /^(?:mailto:)?([^\s@]+@[^\s@]+\.[^\s@]+)$/i,
  },
} satisfies Record<string, LinkTemplate>;

const T = TEMPLATES;

const BY_LOCALE: Record<string, readonly LinkTemplate[]> = {
  ko: [T.instagram, T.x, T.youtube, T.tiktok, T.github, T.kakao, T.naverBlog, T.velog, T.email],
  ja: [
    T.instagram, T.x, T.youtube, T.tiktok, T.note, T.hatenaBlog, T.ameblo, T.pixiv, T.booth, T.github, T.email,
  ],
};

const DEFAULT_TEMPLATES: readonly LinkTemplate[] = [T.instagram, T.x, T.youtube, T.tiktok, T.github, T.email];

const ALL_TEMPLATES: readonly LinkTemplate[] = Object.values(TEMPLATES);

export const KNOWN_TEMPLATE_LABELS: ReadonlySet<string> = new Set(ALL_TEMPLATES.map((t) => t.label));

export function templatesFor(locale: string): readonly LinkTemplate[] {
  return BY_LOCALE[locale] ?? DEFAULT_TEMPLATES;
}

export function fillTemplate(template: LinkTemplate, handle: string): string {
  return template.urlTemplate.replace("{h}", handle);
}

export function extractHandle(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  for (const tpl of ALL_TEMPLATES) {
    const m = tpl.handleRegex.exec(v);
    if (m && m[1]) return m[1];
  }
  return null;
}
