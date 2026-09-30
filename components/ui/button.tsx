"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // transition 은 실제 변하는 속성만 — all 은 폭이 바뀌는 버튼(로딩 라벨 교체 등)까지 미끄러뜨려
  // 레이아웃이 출렁였다. 눌림 스케일(움직임)은 하우스 곡선 var(--ease) 를 탄다(§10.7).
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
  {
    variants: {
      variant: {
        // 다크에서도 같은 깊은 초록 — 흰 글자가 accent-700 위 5.5:1 이라 뒤집을 필요가 없다.
        // (accent-400/500 위 흰 글자는 2.5:1 로 미달이라 밝은 초록 바탕은 쓰지 않는다.)
        default: "bg-accent-700 text-white hover:bg-accent-800",
        accent: "bg-accent-700 text-white hover:bg-accent-800",
        outline:
          "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        subtle:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        destructive: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500",
        link: "text-slate-900 hover:underline underline-offset-4 dark:text-slate-100",
      },
      size: {
        sm: "touch-target h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        // Marketing hero / final CTA — qr-campaigns landing 의 hero CTA 매칭.
        // 반경은 베이스의 lg 그대로(컨트롤 티어 단일) — 크기만 키운다.
        xl: "h-12 px-7 text-[14px]",
        icon: "touch-target h-9 w-9",
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
