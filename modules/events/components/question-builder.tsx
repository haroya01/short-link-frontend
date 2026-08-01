"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { QuestionSpec } from "@/modules/events/api/events";

const MAX_QUESTIONS = 5;

export function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: QuestionSpec[];
  onChange: (questions: QuestionSpec[]) => void;
}) {
  const t = useTranslations("events.form");

  const update = (index: number, patch: Partial<QuestionSpec>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const remove = (index: number) => onChange(questions.filter((_, i) => i !== index));

  const add = () =>
    onChange([...questions, { type: "SHORT_TEXT", label: "", required: false }]);

  return (
    <div className="flex flex-col gap-3">
      {questions.map((question, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50"
        >
          <div className="flex items-center gap-2">
            <Input
              value={question.label}
              onChange={(e) => update(index, { label: e.target.value })}
              maxLength={200}
              placeholder={t("questionPlaceholder")}
              aria-label={t("questionLabel", { n: index + 1 })}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={t("removeQuestion")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={question.type}
              onChange={(e) =>
                update(index, {
                  type: e.target.value as QuestionSpec["type"],
                  options:
                    e.target.value === "SINGLE_CHOICE" ? (question.options ?? ["", ""]) : undefined,
                })
              }
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-[12px] dark:border-slate-600 dark:bg-slate-900"
              aria-label={t("questionType")}
            >
              <option value="SHORT_TEXT">{t("typeShortText")}</option>
              <option value="SINGLE_CHOICE">{t("typeSingleChoice")}</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => update(index, { required: e.target.checked })}
                className="h-3.5 w-3.5 accent-slate-900 dark:accent-slate-100"
              />
              {t("required")}
            </label>
          </div>
          {question.type === "SINGLE_CHOICE" ? (
            <OptionsEditor
              options={question.options ?? []}
              onChange={(options) => update(index, { options })}
            />
          ) : null}
        </div>
      ))}
      {questions.length < MAX_QUESTIONS ? (
        <button
          type="button"
          onClick={add}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-[13px] font-medium text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400"
        >
          <Plus className="h-4 w-4" />
          {t("addQuestion")}
        </button>
      ) : null}
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const t = useTranslations("events.form");
  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={option}
            onChange={(e) =>
              onChange(options.map((o, i) => (i === index ? e.target.value : o)))
            }
            maxLength={100}
            placeholder={t("optionPlaceholder", { n: index + 1 })}
          />
          {options.length > 2 ? (
            <button
              type="button"
              onClick={() => onChange(options.filter((_, i) => i !== index))}
              aria-label={t("removeOption")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      {options.length < 10 ? (
        <button
          type="button"
          onClick={() => onChange([...options, ""])}
          className="self-start text-[12px] font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400"
        >
          {t("addOption")}
        </button>
      ) : null}
    </div>
  );
}
