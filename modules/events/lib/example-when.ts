import { getTranslations } from "next-intl/server";
import { exampleEventTimes } from "./example";
import { eventWhenText, type EventWhenText } from "./format";

export async function exampleWhenText(locale: string): Promise<EventWhenText> {
  const t = await getTranslations({ locale, namespace: "events.public" });
  return eventWhenText(exampleEventTimes(locale), locale, { am: t("am"), pm: t("pm") });
}
