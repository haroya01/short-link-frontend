"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
  {
    variants: {
      variant: {
        // kurl is opting into dark mode — mirror the blog palette (slate-950 page, slate-900 surfaces,
        // white primary CTA) so the two products read as one in dark.
        // 리퀴드화(2026-07-24): 틴트 유지 + 미세 반투명 + backdrop 채도 + 상단 립(inset, ring 합성 보존
        // 위해 shadow-* 유틸). hover 는 응고(불투명) — 누르면 유리가 굳는 촉감.
        default:
          "bg-slate-900/90 text-white backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:bg-slate-900 dark:bg-white/90 dark:text-slate-900 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:hover:bg-white",
        // Dark flips to a light green fill with dark text — white labels on accent-400/500 sit
        // around 2.5:1 and fail WCAG AA; slate-950 on the same fills clears 7:1.
        accent:
          "bg-accent-700/90 text-white backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)] hover:bg-accent-800 dark:bg-accent-500/90 dark:text-slate-950 dark:hover:bg-accent-400",
        outline:
          "border border-slate-200/80 bg-white/60 text-slate-900 backdrop-blur-md backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] hover:bg-white/90 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-100 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] dark:hover:bg-slate-800/80",
        ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        subtle:
          "bg-slate-100/70 text-slate-900 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] hover:bg-slate-200/80 dark:bg-slate-800/70 dark:text-slate-100 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-700/80",
        destructive:
          "bg-red-600/90 text-white backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:bg-red-700 dark:bg-red-600/90 dark:hover:bg-red-500",
        link: "text-slate-900 hover:underline underline-offset-4 dark:text-slate-100",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        // Marketing hero / final CTA — qr-campaigns landing 의 hero CTA 매칭.
        // h-12 + rounded-xl + 14px font, 일반 앱 화면엔 lg 까지가 적절.
        xl: "h-12 rounded-xl px-7 text-[14px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
