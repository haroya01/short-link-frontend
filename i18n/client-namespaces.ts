import type { AbstractIntlMessages } from "next-intl";

/**
 * 클라이언트 프로바이더에 실을 메시지의 허용 목록. 키는 그 목록을 싣는 레이아웃의 경로(app/[locale]
 * 기준, 루트 레이아웃은 "root")이고, 값은 그 레이아웃 아래 클라이언트 컴포넌트가 useTranslations 로
 * 여는 네임스페이스다("events.public" 처럼 하위 경로도 된다).
 *
 * 중첩 스코프는 부모 스코프에 없는 것만 싣고, 클라이언트에서 부모 메시지와 합쳐진다
 * (scoped-intl-provider.tsx) — 한 페이지 payload 에 같은 네임스페이스가 두 번 실리지 않고, 각
 * 화면은 자기 화면이 쓰는 문구만 받는다.
 *
 * 목록은 client-namespaces.test.ts 가 import 그래프 전수 스캔으로 대조한다 — 누락(런타임에 키가
 * 그대로 노출), 부모와의 중복, 더 이상 안 쓰는 항목 모두 실패하고, 실패 메시지가 고칠 목록을 알려 준다.
 */
export const CLIENT_MESSAGE_SCOPES = {
  root: ["common"],
  links: [
    "auth", "cookieConsent", "footer", "home", "languageSwitcher", "loginPrompt", "nav", "qr", "recent",
    "result", "share", "shortenForm", "stats.kpi", "stats.live",
  ],
  "links/admin": ["abuseReports", "admin", "stats"],
  "links/analytics": ["linkAnalytics"],
  "links/auth": ["errors"],
  "links/campaigns": [
    "campaignApp.batchCard", "campaignApp.batchDialogs", "campaignApp.batchesNew",
    "campaignApp.campaignStats", "campaignApp.detail", "campaignApp.new",
    "campaignApp.posterBuilder", "campaignApp.printSheet", "campaignStatus", "campaignsApp",
    "dashboard.onboarding.scene", "errors", "qrDownload", "stats",
  ],
  "links/ctas": ["ctaLibrary", "errors"],
  "links/dashboard": [
    "campaignsApp.onboarding.scene", "composer", "dashboard", "edit", "errors", "expiringBanner",
    "linkSheet", "tags",
  ],
  "links/demo": ["demo", "edit", "errors", "publicStats", "stats", "statsEmpty", "tags"],
  "links/events": [
    "errors", "events.analytics", "events.attendees", "events.detail", "events.form", "events.intro",
    "events.list", "events.public", "events.share", "events.status",
  ],
  "links/login": ["login"],
  "links/more": ["more"],
  "links/qr-campaigns": ["campaignApp.campaignStats", "qrCampaigns"],
  "links/settings": ["avatar", "banner", "errors", "imageCropper", "publicProfile", "settings"],
  "links/showcase": ["publicProfile", "showcase"],
  "links/stats/[code]": [
    "demo.settingsDemo", "demo.settingsNotice", "edit", "errors", "publicStats", "stats", "statsEmpty",
    "tags",
  ],
  "links/visual-fixtures": ["events.public", "publicProfile.contactCard"],
  blog: [
    "auth", "collections", "compose", "cookieConsent", "errors", "footer", "languageSwitcher", "loginPrompt", "mentions",
    "nav", "notes", "notifications", "publicFeed", "publicPost", "publicProfile.gallery", "recent", "sidebar.blog",
    "sidebar.common", "translation",
  ],
  "blog/admin": ["abuseReports", "admin.servers", "blogAdminMetrics"],
  "blog/analytics": ["blogWorkspace", "settings.profile.stats", "stats"],
  "blog/curation": ["blogWorkspace", "savedLibrary"],
  "blog/leads": ["settings.profile.leads"],
  "blog/login": ["blogLogin"],
  "blog/settings": ["blogWorkspace"],
  "blog/webhooks": ["blogWebhooks"],
  "blog/write": ["blogWorkspace", "postEditor", "tags"],
  "p/[username]": [
    "auth", "collections", "comments", "errors", "languageSwitcher", "loginPrompt", "mentions", "nav",
    "notifications", "notes", "postEditor.urlDialog", "publicFeed", "publicPost", "publicProfile.gallery",
    "share", "sidebar.blog", "translation",
  ],
  u: ["auth", "loginPrompt", "publicProfile", "qr"],
  e: ["events.public"],
} as const satisfies Record<string, readonly string[]>;

export type ClientMessageScope = keyof typeof CLIENT_MESSAGE_SCOPES;

const SCOPE_KEYS = Object.keys(CLIENT_MESSAGE_SCOPES) as ClientMessageScope[];

const isTree = (value: unknown): value is AbstractIntlMessages =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 레이아웃 중첩 그대로의 부모 스코프 — 경로가 가장 길게 겹치는 스코프, 없으면 root. */
export function parentScope(scope: ClientMessageScope): ClientMessageScope | null {
  if (scope === "root") return null;
  const ancestors = SCOPE_KEYS.filter((key) => key !== "root" && scope.startsWith(`${key}/`));
  return ancestors.sort((a, b) => b.length - a.length)[0] ?? "root";
}

/** 스코프 안에서 보이는 네임스페이스 전부(자기 목록 + 조상 목록). */
export function visibleNamespaces(scope: ClientMessageScope): string[] {
  const parent = parentScope(scope);
  return [...CLIENT_MESSAGE_SCOPES[scope], ...(parent ? visibleNamespaces(parent) : [])];
}

/** 스코프가 실을 메시지 — 목록에서 조상 스코프가 이미 실은 하위 경로는 뺀다. */
export function scopeMessages(
  messages: AbstractIntlMessages,
  scope: ClientMessageScope,
): AbstractIntlMessages {
  const parent = parentScope(scope);
  const picked = pickMessages(messages, CLIENT_MESSAGE_SCOPES[scope]);
  return parent ? omitMessages(picked, visibleNamespaces(parent)) : picked;
}

function omitPath(messages: AbstractIntlMessages, keys: string[]): AbstractIntlMessages {
  const [head, ...rest] = keys;
  const child = messages[head];
  if (child === undefined) return messages;
  const copy = { ...messages };
  if (rest.length === 0) delete copy[head];
  else if (isTree(child)) copy[head] = omitPath(child, rest);
  return copy;
}

function omitMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  return namespaces.reduce((out, namespace) => omitPath(out, namespace.split(".")), messages);
}

/** 카탈로그에서 목록의 네임스페이스(하위 경로 포함)만 같은 모양으로 뽑는다. */
export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const namespace of namespaces) {
    const keys = namespace.split(".");
    let source: AbstractIntlMessages | string | undefined = messages;
    for (const key of keys) {
      source = isTree(source) ? source[key] : undefined;
    }
    if (source === undefined) continue;
    let target = out;
    for (const key of keys.slice(0, -1)) {
      const next = target[key];
      target = target[key] = isTree(next) ? { ...next } : {};
    }
    target[keys[keys.length - 1]] = source;
  }
  return out;
}

/** 부모 스코프 메시지 위에 자식 스코프 메시지를 얹는다(같은 네임스페이스 아래 하위 경로끼리도 합친다). */
export function mergeMessages(
  base: AbstractIntlMessages,
  extra: AbstractIntlMessages,
): AbstractIntlMessages {
  const out: AbstractIntlMessages = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const prev = out[key];
    out[key] = isTree(prev) && isTree(value) ? mergeMessages(prev, value) : value;
  }
  return out;
}
