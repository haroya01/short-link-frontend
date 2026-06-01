import { getTranslations } from "next-intl/server";

export default async function PublishingNotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-4 text-gray-600">{t("short")}</p>
    </main>
  );
}
