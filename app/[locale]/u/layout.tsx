import { setRequestLocale } from "next-intl/server";
import { AppProviders } from "@/components/common/app-providers";
import { MessagesScope } from "@/i18n/messages-scope";

export default async function PublicProfileGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <MessagesScope locale={locale} scope="u">
      <AppProviders>
        <main className="flex-1">{children}</main>
      </AppProviders>
    </MessagesScope>
  );
}
