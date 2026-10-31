import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const MEASURE = {
  wide: "",
  narrow: "max-w-3xl",
  form: "max-w-2xl",
} as const;

export type LinksPageWidth = keyof typeof MEASURE;

export function LinksPage({
  width = "wide",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { width?: LinksPageWidth }) {
  return (
    <div className="container max-w-5xl py-8">
      <div {...rest} className={cn(MEASURE[width], className)}>
        {children}
      </div>
    </div>
  );
}
