import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MyEvent } from "@/modules/events/api/events";

export function EventStatusBadge({ status }: { status: MyEvent["status"] }) {
  const t = useTranslations("events.status");
  if (status === "OPEN") return <StatusBadge tone="live">{t("open")}</StatusBadge>;
  if (status === "CLOSED") return <StatusBadge tone="neutral">{t("closed")}</StatusBadge>;
  return <StatusBadge tone="danger">{t("canceled")}</StatusBadge>;
}
