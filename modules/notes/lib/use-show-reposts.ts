"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { getNoteFeedPreferences, setShowReposts } from "@/modules/notes/api/notes";

export function useShowReposts(active: boolean) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [shown, setShown] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!active || shown !== null) return;
    let live = true;
    getNoteFeedPreferences()
      .then((preferences) => live && setShown(preferences.showReposts))
      .catch(() => live && setShown(true));
    return () => {
      live = false;
    };
  }, [active, shown]);

  async function set(next: boolean) {
    const before = shown;
    setShown(next);
    try {
      setShown((await setShowReposts(next)).showReposts);
      setVersion((v) => v + 1);
    } catch {
      setShown(before);
      toast(t("settingFailed"), "error");
    }
  }

  return { shown: active ? shown : null, version, set };
}
