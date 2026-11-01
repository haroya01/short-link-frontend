import { useTranslations } from "next-intl";
import { linksHref } from "@/lib/host";

const ROWS: { key: string; use?: string }[] = [
  { key: "password" },
  { key: "schedule" },
  { key: "split" },
  { key: "countries" },
  { key: "openOutside" },
  { key: "card", use: "kakaotalk-link-preview" },
  { key: "bots" },
  { key: "qr", use: "flyer-qr-tracking" },
];

export const ABILITY_KEYS = ROWS.map((row) => row.key);

const ROW =
  "ability-row flex flex-col-reverse gap-1 border-b border-slate-200 py-5 dark:border-slate-800 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:py-6";

export function LinkAbilities({ locale }: { locale: string }) {
  const t = useTranslations("home.abilities");
  return (
    <section aria-labelledby="link-abilities" className="mx-auto mt-28 max-w-2xl sm:mt-40">
      <h2 id="link-abilities" className="ability-row text-[13px] font-semibold text-slate-500 dark:text-slate-400">
        {t("title")}
      </h2>
      <ul className="mt-4 border-t border-slate-200 dark:border-slate-800">
        {ROWS.map((row) => {
          const line = (
            <>
              <span
                className={`text-[18px] font-semibold leading-snug tracking-[-0.015em] text-slate-900 dark:text-slate-100 sm:text-[21px] ${
                  row.use ? "transition-colors group-hover:text-accent-700 dark:group-hover:text-accent-400" : ""
                }`}
              >
                {t(`${row.key}.line`)}
              </span>
              <span className="shrink-0 text-[13px] text-slate-500 dark:text-slate-400">
                {t(`${row.key}.name`)}
                {row.use && <span aria-hidden> ›</span>}
              </span>
            </>
          );
          return (
            <li key={row.key}>
              {row.use ? (
                <a href={linksHref(`/${locale}/use/${row.use}`)} className={`${ROW} focus-ring group`}>
                  {line}
                </a>
              ) : (
                <div className={ROW}>{line}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
