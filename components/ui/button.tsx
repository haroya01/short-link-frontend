"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

type PrimaryVariant = "default" | "accent";

const PrimaryVariantContext = React.createContext<PrimaryVariant>("default");

export function PrimaryVariantProvider({ variant, children }: { variant: PrimaryVariant; children: React.ReactNode }) {
  return <PrimaryVariantContext.Provider value={variant}>{children}</PrimaryVariantContext.Provider>;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  const primary = React.useContext(PrimaryVariantContext);
  return <button ref={ref} className={cn(buttonVariants({ variant: variant ?? primary, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { buttonVariants };
