import { useTranslations } from "next-intl";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { CampaignStatus } from "@/types";

const TONE: Record<CampaignStatus, StatusTone> = {
  DRAFT: "neutral",
  ACTIVE: "live",
  ENDED: "neutral",
  ARCHIVED: "neutral",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const t = useTranslations("campaignStatus");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}
