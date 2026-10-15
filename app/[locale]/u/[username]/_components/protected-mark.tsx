import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

export function ProtectedMark({ size = 20 }: { size?: number }) {
  const t = useTranslations("publicProfile");
  return (
    <span
      role="img"
      aria-label={t("protectedLink")}
      className="inline-flex shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500"
      style={{ width: size, height: size }}
    >
      <Lock aria-hidden style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={2} />
    </span>
  );
}
