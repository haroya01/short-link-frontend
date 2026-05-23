import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ProfileShowcase } from "@/components/profile-showcase";
import { Link } from "@/i18n/navigation";

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
  const t = await getTranslations({ locale, namespace: "showcase" });
  return {
    title: `${t("title")} · kurl`,
    description: t("subhead"),
    alternates: { canonical: `${SITE_URL}/${locale}/showcase` },
    openGraph: {
      title: `${t("title")} · kurl`,
      description: t("subhead"),
      url: `${SITE_URL}/${locale}/showcase`,
      type: "website",
      siteName: "kurl",
      images: [
        {
          url: `${SITE_URL}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${t("title")} · kurl`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${t("title")} · kurl`,
      description: t("subhead"),
      images: [`${SITE_URL}/${locale}/opengraph-image`],
    },
  };
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "showcase" });

  return (
    <div className="overflow-hidden">
      {/* CTA-first hero — flat white surface (no mesh / no noise) so the page reads as restrained
          rather than busy. Single-CTA discipline (one slate-900 primary + scroll cue) kept so the
          surface direction matches the landing. Headline is Pretendard semibold with
          `.tracking-headline` (−0.025em) — same family/treatment as the landing hero. */}
      <section className="relative isolate flex flex-col overflow-hidden bg-white sm:min-h-[640px]">
        <div className="container relative z-10 m-auto max-w-3xl py-20 text-center sm:py-28">
          <div className="hero-stagger space-y-4">
            <div
              className="flex items-center justify-center gap-3"
              style={{ ["--hi" as string]: 0 } as React.CSSProperties}
            >
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
              <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
                {t("eyebrow")}
              </p>
              <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
            </div>
            <h1
              className="text-balance text-[34px] font-semibold leading-[1.05] tracking-headline text-slate-900 sm:text-[48px]"
              style={{ ["--hi" as string]: 1 } as React.CSSProperties}
            >
              {t("ctaTitle")}
            </h1>
            <p
              className="mx-auto max-w-md text-balance text-[15px] leading-relaxed text-slate-500"
              style={{ ["--hi" as string]: 2 } as React.CSSProperties}
            >
              {t("ctaSubhead")}
            </p>
            <div
              className="flex flex-col items-center pt-2"
              style={{ ["--hi" as string]: 3 } as React.CSSProperties}
            >
              <Link
                href="/login?next=/profile/auto"
                className="group inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition hover:bg-accent-700 hover:shadow-[0_12px_32px_-8px_rgba(5,150,105,0.55)]"
              >
                {t("cta")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll cue — landing hero 의 패턴을 그대로 따름: 섹션 절대 위치 bottom-4 + bouncing
            chevron. showcase 만 인라인 cue 였던 게 사용자가 "위치/UI 가 틀리다" 고 지적한
            지점. 클릭 가능하게 anchor 로 두는 것만 landing 과 차이 (landing 은 decorative). */}
        <a
          href="#showcase-examples"
          aria-label={t("scrollCue")}
          className="absolute inset-x-0 bottom-4 mx-auto hidden w-fit flex-col items-center gap-0.5 text-[11px] font-medium text-slate-400 transition hover:text-slate-600 sm:flex"
        >
          <span>{t("scrollCue")}</span>
          <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" />
        </a>
      </section>

      <section id="showcase-examples" className="bg-white py-16 sm:py-20">
        <div className="container max-w-3xl mb-10">
          <div className="section-divider mx-auto mb-10 w-full max-w-xl" aria-hidden />
          <div className="text-center">
            <h2 className="text-balance text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
              {t("title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-balance text-[14px] leading-relaxed text-slate-500">
              {t("subhead")}
            </p>
          </div>
        </div>
        <ProfileShowcase />
      </section>
    </div>
  );
}
