"use client";

import { useInView } from "@/lib/animations";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

export function Reveal({ children, delay = 0, className }: Props) {
  const { ref, seen } = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-700",
        seen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
