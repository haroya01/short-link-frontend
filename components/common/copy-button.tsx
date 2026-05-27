"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = {
  value: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  onCopied?: () => void;
};

export function CopyButton({ value, label, size = "md", variant = "default", onCopied }: Props) {
  const t = useTranslations("common");
  const buttonLabel = label ?? t("copy");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <Button type="button" size={size} variant={variant} onClick={copy} aria-live="polite">
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          <span>{t("copied")}</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </>
      )}
    </Button>
  );
}
