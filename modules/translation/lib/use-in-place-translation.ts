"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import {
  openTranslator,
  primaryLanguage,
  rememberedTranslation,
  translateAll,
  translationSource,
} from "./on-device";

export type TranslationState = "idle" | "busy" | "done";

export function useTranslationSource({
  declared,
  text,
  enabled = true,
}: {
  declared?: string | null;
  text: string;
  enabled?: boolean;
}): string | null {
  const locale = useLocale();
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      setSource(null);
      return;
    }
    let alive = true;
    translationSource({ declared, text, locale }).then((found) => {
      if (alive) setSource(found);
    });
    return () => {
      alive = false;
    };
  }, [declared, text, locale, enabled]);
  return source;
}

export function useInPlaceTranslation({
  source,
  cacheKey,
  texts,
  onTranslated,
  onOriginal,
}: {
  source: string | null;
  cacheKey: string;
  texts: () => string[];
  onTranslated: (translated: string[]) => void;
  onOriginal: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("translation");
  const { toast } = useToast();
  const [state, setState] = useState<TranslationState>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const run = useRef(0);
  const original = useRef(onOriginal);
  original.current = onOriginal;

  useEffect(() => {
    run.current += 1;
    setState("idle");
    original.current();
  }, [cacheKey]);

  async function translate() {
    if (!source || state === "busy") return;
    const target = primaryLanguage(locale);
    const key = `${cacheKey}>${target}`;
    const list = texts();
    const ticket = ++run.current;
    const remembered = rememberedTranslation(key);
    setProgress(null);
    let downloaded = false;
    try {
      if (remembered && remembered.length === list.length) {
        onTranslated(remembered);
        setState("done");
        return;
      }
      setState("busy");
      const translator = await openTranslator(source, target, (loaded) => {
        downloaded = true;
        if (ticket === run.current) setProgress(loaded / 2);
      });
      const out = await translateAll(key, list, translator, (done, total) => {
        if (ticket === run.current) setProgress(downloaded ? 0.5 + done / total / 2 : done / total);
      });
      if (ticket !== run.current) return;
      onTranslated(out);
      setState("done");
    } catch {
      if (ticket !== run.current) return;
      setState("idle");
      toast(t("failed"), "error");
    }
  }

  function showOriginal() {
    run.current += 1;
    onOriginal();
    setState("idle");
  }

  return { state, progress, translate, showOriginal };
}
