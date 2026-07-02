"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

type Toast = {
  id: number;
  message: string;
  variant?: "default" | "success" | "error";
  /** Exit phase — the item stays mounted while animate-toast-out plays (use-presence). */
  closing?: boolean;
};

type ToastContextValue = {
  toast: (message: string, variant?: Toast["variant"]) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);
const MAX_STACK = 3;
// Matches animate-toast-out (tailwind.config) so the row unmounts right as the slide-down ends.
const EXIT_MS = 200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  // Two-phase removal: dismiss flags the toast as closing (plays the exit), remove drops it once
  // the item reports the exit finished — a plain filter here would pop the toast out mid-frame.
  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
  }, []);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((message: string, variant: Toast["variant"] = "default") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }].slice(-MAX_STACK));
    setTimeout(() => dismiss(id), 2600);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* bottom offset is variable-driven so toasts clear the mobile bottom tab bar + cookie banner
          (see --toast-bottom in globals.css); sm:bottom-6 restores the desktop resting position where
          the tab bar is hidden. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-bottom)] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} onGone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
  onGone,
}: {
  toast: Toast;
  onDismiss: () => void;
  onGone: (id: number) => void;
}) {
  const { mounted, closing } = usePresence(!toast.closing, EXIT_MS);

  React.useEffect(() => {
    if (!mounted) onGone(toast.id);
  }, [mounted, toast.id, onGone]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-full pl-4 pr-2 py-2 text-sm shadow-lg",
        closing ? "animate-toast-out" : "animate-toast-in",
        toast.variant === "success" && "bg-accent-700 text-white",
        toast.variant === "error" && "bg-red-600 text-white",
        (!toast.variant || toast.variant === "default") && "bg-slate-900 text-white",
      )}
      role="status"
      aria-live="polite"
    >
      <span className="max-w-[18rem] truncate">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="dismiss"
        className="grid h-5 w-5 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
