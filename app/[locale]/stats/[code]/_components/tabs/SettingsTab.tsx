"use client";

import { useTranslations } from "next-intl";
import { LinkDestinationsSection } from "@/components/link-destinations-section";
import { LinkWebhooksSection } from "@/components/link-webhooks-section";
import type { LinkStats } from "@/types";

export function SettingsTab({
  data,
  onTick,
  demo = false,
}: {
  data: LinkStats;
  onTick: () => void;
  /**
   * The real settings tab mounts {@link LinkDestinationsSection} + {@link LinkWebhooksSection},
   * both of which immediately fetch their own state from {@code /api/v1/links/{code}/...}. On
   * /demo there's no session, so they would fail / silently render empty and look broken. We
   * print a small notice instead — same place, same context, just honest about the surface
   * needing sign-up before it has anything to manage.
   */
  demo?: boolean;
}) {
  if (demo) {
    return <DemoSettingsNotice />;
  }
  return (
    <div className="space-y-5">
      <LinkDestinationsSection
        shortCode={data.shortCode}
        destinationClicks={data.destinationClicks}
        onChanged={onTick}
      />
      <LinkWebhooksSection shortCode={data.shortCode} />
    </div>
  );
}

function DemoSettingsNotice() {
  const t = useTranslations("demo.settingsNotice");
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-medium text-slate-900">{t("title")}</p>
      <p className="mt-1 text-xs text-slate-500">{t("desc")}</p>
    </div>
  );
}
