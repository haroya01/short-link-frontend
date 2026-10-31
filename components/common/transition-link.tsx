"use client";

import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { Link } from "@/i18n/navigation";

export function shouldTransition(event: MouseEvent<HTMLAnchorElement>, currentPath: string): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (event.currentTarget.target && event.currentTarget.target !== "_self") return null;
  const href = event.currentTarget.getAttribute("href");
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return null;
  if (href === currentPath) return null;
  return href;
}

export const TransitionLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<typeof Link>>(
  function TransitionLink({ onClick, ...props }, ref) {
    const router = useTransitionRouter();
    return (
      <Link
        ref={ref}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          const href = shouldTransition(event, window.location.pathname + window.location.search);
          if (!href) return;
          event.preventDefault();
          router.push(href);
        }}
      />
    );
  },
);
