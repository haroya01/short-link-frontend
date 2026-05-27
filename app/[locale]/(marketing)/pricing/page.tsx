import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Shield, Lock } from "lucide-react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  // Keyword-anchored meta — bare "요금제" / "Pricing" carries no informational signal. The
  // on-page H1 still uses the short editorial title; only the SERP surface targets keywords.
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: { canonical: `${SITE_URL}/${locale}/pricing` },
  };
}

/**
 * Pricing page — Pro 결제는 아직 출시 전이라 PricingCta (checkout / portal) 를 노출하지 않는다.
 * Free 플랜 정보 (200 링크 / 8종 분석 / 웹훅 5개 / 2FA) 는 그대로 두고, Pro 섹션은 "추후 출시"
 * disabled 상태로 둬서 "어떤 기능이 Pro 에 들어올지" 정보만 전달.
 *
 * domain card (landing previews) 가 이 페이지로 보내기 때문에 Pro 섹션 정보를 완전 제거하면
 * 사용자가 "왜 도메인 카드가 빈 페이지로 보내지?" 라고 느낄 수 있어 정보는 유지 + 결제 진입만 차단.
 */
export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const free = [
    t("freeFeature1"),
    t("freeFeature2"),
    t("freeFeature3"),
    t("freeFeature4"),
    t("freeFeature5"),
    t("freeFeature6"),
  ];
  const paid = [
    t("paidFeature1"),
    t("paidFeature2"),
    t("paidFeature3"),
    t("paidFeature4"),
    t("paidFeature5"),
    t("paidFeature6"),
  ];
  const rights = [t("right1"), t("right2"), t("right3")];

  return (
    <article className="container max-w-3xl space-y-10 py-16">
      <header className="space-y-3 text-center">
        <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
          {t("title")}
        </h1>
        <p className="text-[15px] leading-relaxed text-slate-500">{t("lead")}</p>
      </header>

      <section
        className="rounded-2xl border border-accent-200 bg-accent-50/50 px-5 py-4"
        aria-label={t("proHoldBadge")}
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
              {t("proHoldBadge")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{t("proHoldNotice")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-[15px] font-semibold tracking-headline text-slate-900">{t("freeTitle")}</h2>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">{t("freePrice")}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {free.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-accent-600">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="relative rounded-2xl border border-slate-200 bg-slate-50/40 p-6"
          aria-label={`${t("paidTitle")} — ${t("proHoldBadge")}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold tracking-headline text-slate-500">{t("paidTitle")}</h2>
            <span className="rounded-full border border-accent-200 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-700">
              {t("proHoldBadge")}
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-400 tabular-nums">{t("paidPrice")}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            {paid.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-slate-400">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              disabled
              aria-disabled
              className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-400"
            >
              <Lock className="h-3.5 w-3.5" />
              {t("proHoldCta")}
            </button>
            <p className="text-center text-[11px] text-slate-500">{t("proEta")}</p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold tracking-headline text-slate-900">{t("rightsTitle")}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{t("rightsLead")}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {rights.map((r) => (
                <li key={r} className="flex items-start gap-2">
                  <span className="mt-0.5 text-slate-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </article>
  );
}
