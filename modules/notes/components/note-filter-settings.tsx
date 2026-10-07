"use client";

import { useState } from "react";
import { ListFilter, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { NoteFilter, NoteFilterContext } from "@/modules/notes/api/notes";
import { removeFilter, saveFilter, useNoteFilters } from "@/modules/notes/lib/note-filters";

const CONTEXTS: NoteFilterContext[] = ["home", "public", "thread", "account", "notifications"];
const DURATIONS = [0, 1800, 3600, 21_600, 43_200, 86_400, 604_800] as const;
const CONTEXT_KEY: Record<NoteFilterContext, string> = {
  home: "filterHome",
  public: "filterPublic",
  thread: "filterThread",
  account: "filterAccount",
  notifications: "filterNotifications",
};

type Form = {
  id: number | null;
  phrase: string;
  wholeWord: boolean;
  context: NoteFilterContext[];
  action: "warn" | "hide";
  expiresIn: number;
};

const blank: Form = {
  id: null,
  phrase: "",
  wholeWord: false,
  context: ["home", "public", "thread"],
  action: "warn",
  expiresIn: 0,
};

export function NoteFilterSettings() {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const filters = useNoteFilters();
  const [form, setForm] = useState<Form>(blank);
  const [saving, setSaving] = useState(false);
  const phrase = form.phrase.trim();
  const ready = !saving && phrase.length > 0 && form.context.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      await saveFilter(
        {
          phrase,
          wholeWord: form.wholeWord,
          context: CONTEXTS.filter((c) => form.context.includes(c)),
          action: form.action,
          expiresIn: form.expiresIn === 0 ? null : form.expiresIn,
        },
        form.id,
      );
      setForm(blank);
    } catch {
      toast(t("filterFailed"), "error");
    } finally {
      setSaving(false);
    }
  }

  function edit(filter: NoteFilter) {
    setForm({
      id: filter.id,
      phrase: filter.phrase,
      wholeWord: filter.wholeWord,
      context: filter.context,
      action: filter.action,
      expiresIn: 0,
    });
  }

  async function remove(filter: NoteFilter) {
    try {
      await removeFilter(filter.id);
      if (form.id === filter.id) setForm(blank);
    } catch {
      toast(t("filterFailed"), "error");
    }
  }

  return (
    <section className="mt-8" aria-labelledby="note-filters-title">
      <h2 id="note-filters-title" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("filtersTitle")}
      </h2>
      <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("filtersHint")}</p>
      <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        {filters.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filters.map((filter) => (
              <li key={filter.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <ListFilter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <button
                  type="button"
                  onClick={() => edit(filter)}
                  className="focus-ring min-w-0 flex-1 rounded text-left"
                  aria-label={t("filterEdit", { phrase: filter.phrase })}
                >
                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                    <span className="truncate">{filter.phrase}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {filter.action === "hide" ? t("filterHide") : t("filterWarn")}
                    </span>
                  </span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {CONTEXTS.filter((c) => filter.context.includes(c))
                      .map((c) => t(CONTEXT_KEY[c]))
                      .join(" · ")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(filter)}
                  aria-label={t("filterDelete", { phrase: filter.phrase })}
                  className="focus-ring rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={submit}
          className={cn("space-y-3 px-3 py-3 text-sm", filters.length > 0 && "border-t border-slate-100 dark:border-slate-800")}
        >
          <input
            value={form.phrase}
            onChange={(e) => setForm({ ...form, phrase: e.target.value })}
            maxLength={100}
            placeholder={t("filterPhrase")}
            aria-label={t("filterPhrase")}
            className="focus-ring w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:text-slate-100"
          />
          <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
            <legend className="mb-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              {t("filterWhere")}
            </legend>
            {CONTEXTS.map((context) => (
              <label key={context} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.context.includes(context)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      context: e.target.checked
                        ? [...form.context, context]
                        : form.context.filter((c) => c !== context),
                    })
                  }
                  className="h-3.5 w-3.5"
                />
                {t(CONTEXT_KEY[context])}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-700 dark:text-slate-200">
            <label className="inline-flex items-center gap-1.5">
              {t("filterWhen")}
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value as "warn" | "hide" })}
                className="focus-ring rounded-lg border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700"
              >
                <option value="warn">{t("filterWarnLong")}</option>
                <option value="hide">{t("filterHideLong")}</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              {t("muteDuration")}
              <select
                value={form.expiresIn}
                onChange={(e) => setForm({ ...form, expiresIn: Number(e.target.value) })}
                className="focus-ring rounded-lg border border-slate-200 bg-transparent px-2 py-1 dark:border-slate-700"
              >
                {DURATIONS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds === 0
                      ? t("muteForever")
                      : seconds < 3600
                        ? t("pollMinutes", { count: seconds / 60 })
                        : seconds < 86_400
                          ? t("pollHours", { count: seconds / 3600 })
                          : t("pollDays", { count: seconds / 86_400 })}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.wholeWord}
                onChange={(e) => setForm({ ...form, wholeWord: e.target.checked })}
                className="h-3.5 w-3.5"
              />
              {t("filterWholeWord")}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            {form.id !== null && (
              <button
                type="button"
                onClick={() => setForm(blank)}
                className="focus-ring rounded-full px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={!ready}
              className="focus-ring rounded-full bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
            >
              {form.id === null ? t("filterAdd") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
