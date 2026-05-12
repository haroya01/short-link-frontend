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
  logoFocalX: 50,
  logoFocalY: 50,
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
    <main className="flex min-h-screen justify-center bg-white py-12">
      {/* Fixed width (no padding-based subtraction) so the snapshot has identical pixel
          dimensions across OSes — padding-derived widths rounded differently between macOS dev
          (400px) and Linux CI (401px), and Playwright's toHaveScreenshot requires the size to
          match exactly before pixel ratios are even computed. Pin width directly to remove the
          source of variance entirely. */}
      <div data-testid="fixture" className="w-[400px]">
        {renderer()}
      </div>
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
