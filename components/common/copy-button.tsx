"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  /** Visible label; an empty string makes an icon-only button. */
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  onCopied?: () => void;
};

export function CopyButton({ value, label, size = "md", variant = "default", className, onCopied }: Props) {
  const t = useTranslations("common");
  const { toast } = useToast();
  const text = label ?? t("copy");
  const iconOnly = text === "";
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast(t("copyFailed"), "error");
      return;
    }
    setCopied(true);
    onCopied?.();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  const Icon = copied ? Check : Copy;
  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={copy}
        aria-label={iconOnly ? t("copy") : undefined}
        className={cn(iconOnly && "px-2", className)}
      >
        <Icon aria-hidden className="h-4 w-4" />
        {!iconOnly && (
          <span className="grid">
            <span className={cn("col-start-1 row-start-1", copied && "invisible")}>{text}</span>
            <span className={cn("col-start-1 row-start-1", !copied && "invisible")}>{t("copied")}</span>
          </span>
        )}
      </Button>
      <span className="sr-only" role="status">
        {copied ? t("copied") : ""}
      </span>
    </>
  );
}
