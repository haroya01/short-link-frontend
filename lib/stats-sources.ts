import type { LinkStats } from "@/types";

function directClicks(data: Pick<LinkStats, "channelClicks">): number {
  return (data.channelClicks ?? []).find((c) => c.channel === "direct")?.count ?? 0;
}

export function sourceBreakdown(
  data: Pick<LinkStats, "referrerHostClicks" | "channelClicks" | "humanClicks">,
  directLabel: string,
): { items: { label: string; count: number }[]; total: number } {
  const direct = directClicks(data);
  return {
    items: [
      ...(data.referrerHostClicks ?? []).map((r) => ({ label: r.host, count: r.count })),
      ...(direct > 0 ? [{ label: directLabel, count: direct }] : []),
    ],
    total: data.humanClicks ?? 0,
  };
}
