"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";

export default function PostsLandingPage() {
  const t = useTranslations("postsLanding");
  const { authenticated, ready } = useAuth();

  const ctaHref = !ready
    ? "/login"
    : authenticated
      ? "/content/write"
      : "/login?next=/content/write";

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("headline")}
        </h1>
        <p className="mt-4 text-base text-slate-600">{t("subhead")}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ctaHref}
            className="group inline-flex h-11 items-center gap-2 rounded-xl bg-accent-600 px-6 text-sm font-medium text-white transition-colors hover:bg-accent-700"
          >
            {t("startWriting")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {t("recentPostsLabel")}
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-sm text-slate-500">{t("recentPostsEmpty")}</p>
        </div>
      </section>
    </main>
  );
}
