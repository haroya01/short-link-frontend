import { NewEventScreen } from "@/modules/events/components/new-event-screen";
import { exampleWhenText } from "@/modules/events/lib/example-when";

export default async function NewEventPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <NewEventScreen introWhen={await exampleWhenText(locale)} />;
}
