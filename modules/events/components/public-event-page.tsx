"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import type { PublicEvent } from "@/modules/events/api/events";
import { placeIdFromUrl } from "@/modules/events/lib/format";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
import { CancelRegistrationPanel } from "./cancel-registration-panel";
import { EventHead } from "./event-head";
import { RegistrationPanel } from "./registration-panel";

/**
 * 참석자가 보는 초대장 — kurl 종이 문법. 카드 상자·아이콘 타일을 걷어내고 흰 종이 한 컬럼에
 * 헤어라인으로만 단락을 가른다. 색은 브랜드 초록 한 가닥(CTA·라벨)만: 초대장은 조용할수록
 * 이벤트가 주인공이 된다.
 */
export function PublicEventPage({
  initialEvent,
  description,
}: {
  initialEvent: PublicEvent;
  /** 서버에서 렌더한 설명 마크다운 — 마크다운·하이라이트 파이프라인이 클라이언트 번들에 실리지 않게. */
  description?: ReactNode;
}) {
  const t = useTranslations("events.public");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const cancelToken = searchParams.get("cancel");
  const [event, setEvent] = useState(initialEvent);

  const scrollToForm = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <main className="mx-auto w-full max-w-[42rem] px-5 pb-16 pt-8 sm:pt-12">
        <EventHead event={event} />

        {!cancelToken && event.acceptingRegistrations ? (
          <button
            type="button"
            onClick={scrollToForm}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-accent-700 text-base font-semibold text-white transition-colors hover:bg-accent-800"
          >
            {t("cta")}
          </button>
        ) : null}

        {cancelToken ? (
          <CancelRegistrationPanel token={cancelToken} eventTitle={event.title} />
        ) : null}

        {/* 지도 임베드 — Places 자동완성이 채운 장소(query_place_id 보유)에서만, 그리고
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 가 있을 때만 그린다. 키가 없으면 위 장소 링크가
            폴백이라 이 블록은 조용히 사라진다(키 등록 즉시 켜지는 사전 배선). */}
        {MAPS_KEY && event.locationUrl && placeIdFromUrl(event.locationUrl) ? (
          <iframe
            title={event.locationText ?? "map"}
            className="mt-6 aspect-[2/1] w-full rounded-2xl border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=place_id:${placeIdFromUrl(event.locationUrl)}&language=${locale}`}
          />
        ) : null}

        {description ? (
          <section className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800">
            <div className="prose-text-block text-slate-800 dark:text-slate-200">{description}</div>
          </section>
        ) : null}

        {!cancelToken ? (
          <RegistrationPanel
            event={event}
            onRegistered={(spotsLeft) => {
              setEvent((prev) => ({
                ...prev,
                attending: prev.attending + 1,
                spotsLeft: spotsLeft != null ? spotsLeft : prev.spotsLeft,
              }));
            }}
          />
        ) : null}

        <footer className="mt-12 flex justify-center">
          <MadeWithKurl />
        </footer>
      </main>
    </div>
  );
}
