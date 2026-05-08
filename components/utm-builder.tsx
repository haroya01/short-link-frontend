"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "./ui/input";

const STORAGE_KEY = "kurl:utm-defaults:v1";

type Utm = { source: string; medium: string; campaign: string; term: string; content: string };

const EMPTY: Utm = { source: "", medium: "", campaign: "", term: "", content: "" };

type Props = {
  baseUrl: string;
  onChange: (decoratedUrl: string) => void;
  disabled?: boolean;
};

export function UtmBuilder({ baseUrl, onChange, disabled }: Props) {
  const t = useTranslations("utm");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Utm>(EMPTY);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Utm;
        setValues({ ...EMPTY, ...parsed });
        setRemember(true);
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    onChange(decorate(baseUrl, values));
  }, [baseUrl, values, onChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (remember) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [values, remember]);

  const finalUrl = decorate(baseUrl, values);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
        {t("toggle")}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-md border border-slate-200 bg-slate-50/50 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field
              label={t("source")}
              value={values.source}
              placeholder={t("placeholderSource")}
              onChange={(v) => setValues((s) => ({ ...s, source: v }))}
              disabled={disabled}
            />
            <Field
              label={t("medium")}
              value={values.medium}
              placeholder={t("placeholderMedium")}
              onChange={(v) => setValues((s) => ({ ...s, medium: v }))}
              disabled={disabled}
            />
            <Field
              label={t("campaign")}
              value={values.campaign}
              placeholder={t("placeholderCampaign")}
              onChange={(v) => setValues((s) => ({ ...s, campaign: v }))}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label={t("term")}
              value={values.term}
              onChange={(v) => setValues((s) => ({ ...s, term: v }))}
              disabled={disabled}
            />
            <Field
              label={t("content")}
              value={values.content}
              onChange={(v) => setValues((s) => ({ ...s, content: v }))}
              disabled={disabled}
            />
          </div>

          {finalUrl && finalUrl !== baseUrl && (
            <div className="rounded-md bg-white p-2.5 text-[11px]">
              <span className="font-medium text-slate-500">{t("preview")}: </span>
              <code className="break-all text-slate-700">{finalUrl}</code>
            </div>
          )}

          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3 w-3"
            />
            {t("remember")}
          </label>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
        disabled={disabled}
      />
    </label>
  );
}

function decorate(baseUrl: string, utm: Utm): string {
  if (!baseUrl) return baseUrl;
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    return baseUrl;
  }
  setIfPresent(u, "utm_source", utm.source);
  setIfPresent(u, "utm_medium", utm.medium);
  setIfPresent(u, "utm_campaign", utm.campaign);
  setIfPresent(u, "utm_term", utm.term);
  setIfPresent(u, "utm_content", utm.content);
  return u.toString();
}

function setIfPresent(u: URL, key: string, value: string) {
  if (value && value.trim()) {
    u.searchParams.set(key, value.trim());
  }
}
