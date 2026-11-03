import { EventsHome } from "@/modules/events/components/events-home";
import { exampleWhenText } from "@/modules/events/lib/example-when";

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <EventsHome introWhen={await exampleWhenText(locale)} />;
}
