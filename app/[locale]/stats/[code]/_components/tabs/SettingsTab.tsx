"use client";

import { LinkDestinationsSection } from "@/components/link-destinations-section";
import { LinkWebhooksSection } from "@/components/link-webhooks-section";
import type { LinkStats } from "@/types";

export function SettingsTab({ data, onTick }: { data: LinkStats; onTick: () => void }) {
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
