import type { CSSProperties, ReactNode } from "react";
import { Mark } from "@/components/common/logo";
import { cn } from "@/lib/utils";

type Props = {
  /** Wraps the mark so it links back to the product's home (a locale Link or a cross-host <a>). */
  home: (mark: ReactNode) => ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Only the sign-in entrance plays the mark draw-in; later steps of the same flow sit still. */
  animated?: boolean;
};

const order = (name: "--hi" | "--idx", value: number) => ({ [name]: value }) as CSSProperties;

export function AuthFrame({ home, title, description, children, footer, animated = false }: Props) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-5 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col items-center text-center", animated && "hero-stagger")}>
          <div className={animated ? "mark-draw-in" : undefined} style={order("--hi", 0)}>
            {home(<Mark animated={animated} className="h-9 w-auto text-accent-600 dark:text-accent-500" />)}
          </div>
          <h1
            className="mt-6 text-[24px] font-semibold tracking-headline text-slate-900 dark:text-slate-100"
            style={order("--hi", 1)}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-2 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400"
              style={order("--hi", 2)}
            >
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className={cn("mt-9 space-y-3", animated && "profile-fade")} style={order("--idx", 4)}>
            {children}
          </div>
        )}

        {footer && (
          <div className={cn("mt-8 text-center", animated && "profile-fade")} style={order("--idx", 6)}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
