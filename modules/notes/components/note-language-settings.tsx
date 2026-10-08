"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { getNoteFeedPreferences, setNoteLanguages } from "@/modules/notes/api/notes";
import { languageName, NOTE_LANGUAGES } from "@/modules/notes/lib/note-languages";

/** Blog settings: Mastodon's filter languages for All notes and Trending. None chosen shows all. */
export function NoteLanguageSettings() {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [chosen, setChosen] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    getNoteFeedPreferences()
      .then((preferences) => alive && setChosen(preferences.languages ?? []))
      .catch(() => alive && setChosen([]));
    return () => {
      alive = false;
    };
  }, []);

  async function save(next: string[]) {
    const before = chosen;
    setChosen(next);
    try {
      setChosen((await setNoteLanguages(next)).languages);
    } catch {
      setChosen(before);
      toast(t("languagesFailed"), "error");
    }
  }

  if (chosen === null) return null;
  return (
    <section aria-labelledby="note-languages-title" className="mt-8">
      <h2 id="note-languages-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("languagesTitle")}
      </h2>
      <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">{t("languagesHint")}</p>
      <fieldset className="flex flex-wrap gap-2 rounded-surface border border-slate-200 p-3 dark:border-slate-800">
        <legend className="sr-only">{t("languagesTitle")}</legend>
        <label className={chip}>
          <input
            type="checkbox"
            className="sr-only"
            checked={chosen.length === 0}
            onChange={() => void save([])}
          />
          {t("languagesAll")}
        </label>
        {NOTE_LANGUAGES.map((code) => (
          <label key={code} className={chip}>
            <input
              type="checkbox"
              className="sr-only"
              checked={chosen.includes(code)}
              onChange={(e) =>
                void save(
                  NOTE_LANGUAGES.filter((c) => (c === code ? e.target.checked : chosen.includes(c))),
                )
              }
            />
            {languageName(code)}
          </label>
        ))}
      </fieldset>
    </section>
  );
}

const chip =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-[13px] text-slate-700 transition-colors duration-200 has-[:checked]:border-accent-600 has-[:checked]:bg-accent-50 has-[:checked]:text-accent-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-500 dark:border-slate-700 dark:text-slate-200 dark:has-[:checked]:bg-accent-500/10 dark:has-[:checked]:text-accent-200";
