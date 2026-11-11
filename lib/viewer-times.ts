import { useMemo } from "react";
import { useFormatter } from "next-intl";

type DateTimeFormatter = Pick<ReturnType<typeof useFormatter>, "dateTime">;

export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// next-intl formats in the provider's time zone, which is the server's, unless one is passed.
export function viewerTimes(format: DateTimeFormatter, timeZone: string) {
  return {
    time: (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone }),
    date: (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone }),
  };
}

/**
 * For content that first renders in the browser (after a client fetch). During server rendering the
 * resolved zone is the server's, so markup rendered there would not match the browser's.
 */
export function useViewerTimes() {
  const format = useFormatter();
  return useMemo(() => viewerTimes(format, viewerTimeZone()), [format]);
}
