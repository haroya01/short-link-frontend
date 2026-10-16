import React, { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import type { LinkDetail, LinkDisableReason } from "@/types";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { href, ...props }, children),
}));

import { LinkModerationBanner } from "./link-moderation-banner";

const MESSAGES = { ko, ja, en } as unknown as Record<string, AbstractIntlMessages>;

let root: Root | null = null;
let host: HTMLElement;

async function render(locale: "ko" | "ja" | "en", reason: LinkDisableReason) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const detail = {
    shortCode: "e2eOff1",
    moderation: { reason, disabledAt: "2026-09-30T03:00:00Z" },
  } as unknown as LinkDetail;
  await act(async () =>
    root!.render(
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Seoul">
        <LinkModerationBanner detail={detail} />
      </NextIntlClientProvider>,
    ),
  );
  return host.querySelector("p")!.textContent!;
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("switched-off link banner", () => {
  it.each<LinkDisableReason>(["ABUSE_REPORT", "ADMIN", "SAFE_BROWSING"])(
    "ja runs its %s sentences together with no space after 。",
    async (reason) => {
      const text = await render("ja", reason);
      expect(text.startsWith("このリンクは停止中です。2026年9月30日に")).toBe(true);
      expect(text).toMatch(/しました。現在このリンクを開くと/);
      expect(text).not.toMatch(/[。、] /);
    },
  );

  it("ko and en keep a space between sentences", async () => {
    expect(await render("ko", "SAFE_BROWSING")).toBe(
      "꺼진 링크예요. 2026년 9월 30일에 Google Safe Browsing이 목적지를 위험한 사이트로 분류해 자동으로 꺼졌어요. 지금 이 링크를 여는 사람은 목적지 대신 꺼진 링크 안내를 봐요.",
    );
    await act(async () => root!.unmount());
    document.body.innerHTML = "";
    expect(await render("en", "ADMIN")).toBe(
      "This link is switched off. On September 30, 2026, an operator switched it off for breaking our usage policy. Anyone who opens it now sees a switched-off notice instead of the destination.",
    );
  });

  it("keeps the opening sentence bold", async () => {
    await render("ja", "ADMIN");
    expect(host.querySelector(".font-semibold")?.textContent).toBe("このリンクは停止中です。");
  });
});
