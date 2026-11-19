import { getLocale, getTranslations } from "next-intl/server";
import PublishingNotFound from "../not-found";
import { MemberPostGate } from "../_components/member-post-gate";
import { PostColophon } from "../_components/post-chrome";

export default async function PostNotFound() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  return (
    <MemberPostGate
      colophon={
        <PostColophon
          locale={locale}
          copyright={t("copyright", { year: new Date().getFullYear() })}
          terms={t("terms")}
          privacy={t("privacy")}
        />
      }
    >
      <PublishingNotFound />
    </MemberPostGate>
  );
}
