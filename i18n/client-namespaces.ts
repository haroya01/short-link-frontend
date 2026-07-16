import type { AbstractIntlMessages } from "next-intl";

/**
 * 클라이언트 프로바이더에 실을 네임스페이스 절단 — 카탈로그 전체(en 145KB~hi 263KB, gz 44–56KB)가
 * 모든 페이지 payload 에 임베드되던 것의 다이어트. 근거는 클라이언트 컴포넌트("use client")의
 * useTranslations 사용처 전수 스캔(2026-07-16): 아래 목록은 "그 세그먼트 밖 클라이언트에서 사용 0"이
 * 확인된 것만 담는다. 애매한 것(settings·stats·dashboard·home 등 공유 판정)은 루트에 남긴다 —
 * 누락은 런타임 MISSING_MESSAGE 라 보수적으로.
 *
 * 중첩 NextIntlClientProvider 는 messages 를 병합이 아니라 **대체**하므로(use-intl react.js:27),
 * 세그먼트 프로바이더는 공용분을 스스로 포함해야 한다(omit 방식이 그걸 자연히 보장).
 */

/** 서버(getTranslations)에서만 쓰여 클라이언트 프로바이더에 실을 필요가 없는 네임스페이스. */
const SERVER_ONLY = [
  "privacy",
  "terms",
  "learn",
  "about",
  "utm",
  "postAnalytics",
  "meta",
  "notFound",
  "workspaceGate",
];

/** links 제품 세그먼트(app/[locale]/links/**)의 클라이언트에서만 쓰이는 네임스페이스. */
const LINKS_ONLY = [
  "campaignApp",
  "qrCampaigns",
  "edit",
  "campaignsApp",
  "shortenForm",
  "qrDownload",
  "ctaLibrary",
  "weeklyInsights",
  "demo",
  "result",
  "login",
  "qr",
  "statsEmpty",
  "expiringBanner",
  "authGate",
  "campaignStatus",
  "publicStats",
];

/** 관리자 세그먼트(blog/admin·links/admin) 전용. */
const ADMIN_ONLY = ["admin", "abuseReports", "blogAdminMetrics"];

function omit(messages: AbstractIntlMessages, keys: string[]): AbstractIntlMessages {
  const out: AbstractIntlMessages = { ...messages };
  for (const k of keys) delete out[k];
  return out;
}

/** 루트 레이아웃 프로바이더용 — 공용 클라이언트 네임스페이스만. */
export function rootClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return omit(messages, [...SERVER_ONLY, ...LINKS_ONLY, ...ADMIN_ONLY]);
}

/** links 세그먼트 프로바이더용 — 공용 + links(admin·서버 전용 제외). */
export function linksClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return omit(messages, [...SERVER_ONLY, ...ADMIN_ONLY]);
}

/** 관리자 세그먼트 프로바이더용 — 서버 전용만 제외(관리 화면은 payload 최적화 대상 아님). */
export function adminClientMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return omit(messages, SERVER_ONLY);
}
