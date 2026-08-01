"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CONSENT_CHANGE_EVENT, readConsent, writeConsent } from "@/lib/cookie-consent";
import type { ConsentValue } from "@/lib/cookie-consent";

/**
 * 개인정보 처리방침에 놓이는 동의 철회/변경 컨트롤. 동의를 주는 것만큼 거두는 것도 쉬워야 하는데,
 * 배너는 한 번 고르면 다시 뜨지 않으므로 이 화면이 유일한 재진입점이다.
 *
 * <p>현재 상태를 먼저 보여주고 반대쪽으로 가는 버튼을 준다 — "지금 어떤 상태인지" 를 모르면
 * 바꿀 수도 없다. 아직 아무것도 안 고른 방문자(배너가 떠 있는 상태)에게는 양쪽을 다 준다.
 */
export function ConsentPreferences() {
  const t = useTranslations("cookieConsent");
  const [value, setValue] = useState<ConsentValue | null>(null);
  // 쿠키는 클라이언트에서만 읽힌다. 서버 렌더와 어긋나지 않도록 마운트 뒤에 확정한다.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(readConsent());
    setReady(true);
    // 다른 탭/배너에서 바꾼 결과도 따라간다.
    const sync = () => setValue(readConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  function set(next: ConsentValue) {
    writeConsent(next);
    setValue(next);
  }

  const status = !ready ? "" : value === "accepted" ? t("stateOn") : value === "rejected" ? t("stateOff") : t("stateUnset");

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h2 className="text-lg font-semibold tracking-headline text-slate-900 dark:text-slate-100">
        {t("prefsTitle")}
      </h2>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {t("prefsDesc")}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        {status}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => set("rejected")}
          disabled={!ready || value === "rejected"}
          className="focus-ring rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-default disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t("reject")}
        </button>
        <button
          type="button"
          onClick={() => set("accepted")}
          disabled={!ready || value === "accepted"}
          className="focus-ring rounded-md border border-transparent bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-default disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t("accept")}
        </button>
      </div>
    </section>
  );
}
