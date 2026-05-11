import { notFound } from "next/navigation";
import { ContactCardEntry } from "@/app/[locale]/u/[username]/_components/ContactCardEntry";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import type { ContactCardConfig } from "@/types";

/**
 * Visual snapshot fixtures — accessed by the Playwright visual suite. Each slug renders a
 * component variant with hardcoded mock data so the snapshot has zero runtime variation
 * (no API, no current time, no random data). Pages live under {@code /__visual/} so they read
 * as private fixtures, but they're plain Next.js routes — accessible everywhere. Mock content
 * only; no user data, no risk if indexed (we still send {@code noindex} headers from the
 * layout below to keep them out of search results).
 *
 * <p>Add a new fixture by appending an entry to {@link FIXTURES}. The visual test
 * ({@code e2e/visual.spec.ts}) iterates the slugs it cares about.
 */

const SAMPLE_CONTACT_CARD: ContactCardConfig = {
  name: "도현 김",
  title: "Founder",
  company: "kurl.me",
  email: "founder@kurl.me",
  phone: "+82 10-1234-5678",
  address: "서울",
  website: "https://kurl.me",
  logoUrl: null,
  palette: null,
};

const FIXTURES: Record<string, () => React.ReactNode> = {
  "contact-card-amethyst": () => (
    <ContactCardFixture config={{ ...SAMPLE_CONTACT_CARD, palette: "amethyst" }} />
  ),
  "contact-card-rose-gold": () => (
    <ContactCardFixture config={{ ...SAMPLE_CONTACT_CARD, palette: "rose-gold" }} />
  ),
  "contact-card-emerald": () => (
    <ContactCardFixture config={{ ...SAMPLE_CONTACT_CARD, palette: "emerald" }} />
  ),
  "contact-card-midnight": () => (
    <ContactCardFixture config={{ ...SAMPLE_CONTACT_CARD, palette: "midnight" }} />
  ),
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(FIXTURES).map((slug) => ({ slug }));
}

export const metadata = {
  robots: "noindex, nofollow",
};

export default function VisualFixturePage({
  params,
}: {
  params: { slug: string };
}) {
  const renderer = FIXTURES[params.slug];
  if (!renderer) notFound();
  return (
    <main className="mx-auto max-w-md p-6">
      <div data-testid="fixture">{renderer()}</div>
    </main>
  );
}

function ContactCardFixture({ config }: { config: ContactCardConfig }) {
  return (
    <ul className="space-y-4">
      <ContactCardEntry
        content={JSON.stringify(config)}
        colors={THEME_TABLE.default}
      />
    </ul>
  );
}
