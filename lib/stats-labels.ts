import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { countryName } from "@/lib/utils";

/**
 * 통계 원값 → 사람 말. 저장된 값(카카오톡 UA 토큰, Sec-Fetch-Site 스펙 값)을 그대로 화면에
 * 노출하지 않기 위한 얇은 사전이다. 카탈로그에 없는 값은 번역을 시도하지 않고 원값 그대로
 * 내보낸다 — 백엔드가 앱을 하나 더 분류하기 시작해도 화면이 빈칸이 되지 않게(요일 폴백과 같은 방식).
 */

/** 백엔드 {@code clientApp.*} 메시지 키와 같은 목록. */
const CLIENT_APPS: ReadonlySet<string> = new Set([
  "kakaotalk",
  "instagram",
  "line",
  "facebook",
  "naver",
  "daum",
  "tiktok",
  "twitter",
]);

/**
 * Sec-Fetch-Site 스펙 4값 → 메시지 키. 하이픈이 든 원값을 그대로 키로 쓰지 않고 camelCase 로
 * 옮긴다(카탈로그 키에 하이픈이 섞이는 걸 막는 쪽).
 */
export const FETCH_SITE_KEYS: Readonly<Record<string, string>> = {
  none: "direct",
  "cross-site": "crossSite",
  "same-site": "sameSite",
  "same-origin": "sameOrigin",
};

/** 백엔드 ReferrerChannelClassifier 가 내는 채널 값. */
const CHANNELS: ReadonlySet<string> = new Set([
  "social",
  "messaging",
  "search",
  "email",
  "newsletter",
  "other",
  "direct",
]);

/** 백엔드 UserAgentClassifier.mapDevice 가 내는 기기 값. */
const DEVICES: ReadonlySet<string> = new Set(["mobile", "desktop", "tablet", "bot", "unknown"]);

/** 백엔드 LinkPreviewCrawlerDetector 토큰 → 서비스 이름. */
const CRAWLERS: Readonly<Record<string, string>> = {
  "slackbot-linkexpanding": "Slack",
  slackbot: "Slack",
  twitterbot: "X",
  facebookexternalhit: "Facebook",
  facebot: "Facebook",
  linkedinbot: "LinkedIn",
  discordbot: "Discord",
  whatsapp: "WhatsApp",
  telegrambot: "Telegram",
  skypeuripreview: "Skype",
  embedly: "Embedly",
  pinterest: "Pinterest",
  redditbot: "Reddit",
  applebot: "Apple",
  vkshare: "VK",
  "xing-contenttabreceiver": "XING",
  iframely: "Iframely",
  nuzzel: "Nuzzel",
  googleplus: "Google+",
  googlebot: "Google",
};

const PREVIEW_PREFIX = "preview:";
const DATACENTER_PREFIX = "datacenter:";
const BURST_LABEL = "rate-flood";
const PREFETCH_TOKEN = "prefetch";
const KAKAO_CRAWLER = "kakaotalk-scrap";

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type StatsLabels = ReturnType<typeof statsLabels>;

export function statsLabels(t: Translate, locale: string) {
  const unknown = t("unknown");
  const channel = (value: string | null | undefined) =>
    !value ? unknown : CHANNELS.has(value) ? t(`channel.${value}`) : value;
  const device = (value: string | null | undefined) =>
    !value ? unknown : DEVICES.has(value) ? t(`device.${value}`) : value;
  const named = (value: string | null | undefined) => (!value || value === "unknown" ? unknown : value);
  const country = (code: string | null | undefined) => {
    const upper = code?.toUpperCase() ?? "";
    if (upper.length !== 2 || upper === "UN" || upper === "ZZ") return unknown;
    return countryName(upper, locale);
  };
  const bot = (raw: string | null | undefined) => {
    if (!raw || raw === "unknown") return unknown;
    if (raw === BURST_LABEL) return t("botKind.burst");
    if (raw.startsWith(DATACENTER_PREFIX)) {
      const org = raw.slice(DATACENTER_PREFIX.length);
      return org && org !== "unknown" ? `${t("botKind.datacenter")} · ${org}` : t("botKind.datacenter");
    }
    if (raw.startsWith(PREVIEW_PREFIX)) {
      const token = raw.slice(PREVIEW_PREFIX.length);
      if (token === PREFETCH_TOKEN) return t("botKind.prefetch");
      const name = token === KAKAO_CRAWLER ? t("kakaotalk") : CRAWLERS[token] ?? token;
      return `${t("botKind.preview")} · ${name}`;
    }
    return raw;
  };
  const language = (code: string | null | undefined) => {
    if (!code) return unknown;
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  const clientApp = (value: string | null | undefined) =>
    !value || value === "direct" ? t("clientApp.browser") : CLIENT_APPS.has(value) ? t(`clientApp.${value}`) : value;
  const source = (value: string | null | undefined) => {
    if (!value) return unknown;
    const profile = /^profile-(.+)$/.exec(value);
    return profile ? t("source.profile", { user: profile[1] }) : value;
  };
  return { unknown, channel, device, os: named, browser: named, country, bot, language, source, clientApp };
}

export function useStatsLabels(): StatsLabels {
  const t = useTranslations("statLabels");
  const locale = useLocale();
  return useMemo(() => statsLabels(t as Translate, locale), [t, locale]);
}
