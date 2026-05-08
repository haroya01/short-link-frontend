"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function HomeFaq() {
  const t = useTranslations("homeFaq");
  const items = [1, 2, 3, 4, 5, 6].map((i) => ({
    q: t(`q${i}` as never),
    a: t(`a${i}` as never),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="container max-w-3xl py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
        {t("title")}
      </h2>
      <ul className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {items.map((item, idx) => (
          <FaqItem key={idx} q={item.q} a={item.a} />
        ))}
      </ul>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
      )}
    </li>
  );
}
