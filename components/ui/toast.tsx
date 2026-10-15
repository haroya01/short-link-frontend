"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

export type ToastAction = { label: string; onClick: () => void };

type Toast = {
  id: number;
  message: string;
  variant?: "default" | "success" | "error";
  action?: ToastAction;
  /** Exit phase — the item stays mounted while animate-toast-out plays (use-presence). */
  closing?: boolean;
};

type ToastContextValue = {
  toast: (message: string, variant?: Toast["variant"], options?: { action?: ToastAction }) => void;
};

type Timer = { handle: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number };

const ToastContext = React.createContext<ToastContextValue | null>(null);
const MAX_STACK = 3;
// Matches animate-toast-out (tailwind.config) so the row unmounts right as the slide-down ends.
const EXIT_MS = 200;
const DURATION_MS = 2600;
const ACTION_DURATION_MS = 4500;
const RESUME_MIN_MS = 1200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);
  const timers = React.useRef(new Map<number, Timer>());

  // Two-phase removal: dismiss flags the toast as closing (plays the exit), remove drops it once
  // the item reports the exit finished — a plain filter here would pop the toast out mid-frame.
  const dismiss = React.useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    timers.current.delete(id);
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
  }, []);

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const arm = React.useCallback(
    (id: number, ms: number) => {
      const handle = setTimeout(() => dismiss(id), ms);
      timers.current.set(id, { handle, remaining: ms, startedAt: Date.now() });
    },
    [dismiss],
  );

  const hold = React.useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (!timer?.handle) return;
    clearTimeout(timer.handle);
    timers.current.set(id, {
      handle: null,
      remaining: timer.remaining - (Date.now() - timer.startedAt),
      startedAt: 0,
    });
  }, []);

  const resume = React.useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (!timer || timer.handle) return;
      arm(id, Math.max(timer.remaining, RESUME_MIN_MS));
    },
    [arm],
  );

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => timer.handle && clearTimeout(timer.handle));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    (message, variant = "default", options) => {
      const id = ++idRef.current;
      const action = options?.action;
      setToasts((prev) => [...prev, { id, message, variant, action }].slice(-MAX_STACK));
      arm(id, action ? ACTION_DURATION_MS : DURATION_MS);
    },
    [arm],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* bottom offset is variable-driven so toasts clear the mobile bottom tab bar + cookie banner
          (see --toast-bottom in globals.css); sm:bottom-6 restores the desktop resting position where
          the tab bar is hidden. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-bottom)] z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => dismiss(t.id)}
            onHold={(held) => (held ? hold(t.id) : resume(t.id))}
            onGone={remove}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
  onHold,
  onGone,
}: {
  toast: Toast;
  onDismiss: () => void;
  onHold: (held: boolean) => void;
  onGone: (id: number) => void;
}) {
  const t = useTranslations("common");
  const { mounted, closing } = usePresence(!toast.closing, EXIT_MS);
  const holds = React.useRef({ pointer: false, focus: false });

  React.useEffect(() => {
    if (!mounted) onGone(toast.id);
  }, [mounted, toast.id, onGone]);

  if (!mounted) return null;

  const setHold = (key: "pointer" | "focus", on: boolean) => {
    holds.current[key] = on;
    onHold(holds.current.pointer || holds.current.focus);
  };
  const plain = !toast.variant || toast.variant === "default";

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-full items-center gap-3 rounded-3xl py-2 pl-4 pr-2 text-sm shadow-float",
        closing ? "animate-toast-out" : "animate-toast-in",
        toast.variant === "success" && "bg-accent-700 text-white",
        toast.variant === "error" && "bg-red-600 text-white",
        plain && "bg-slate-900 text-white",
      )}
      role="status"
      aria-live="polite"
      data-testid="toast"
      onPointerEnter={() => setHold("pointer", true)}
      onPointerLeave={() => setHold("pointer", false)}
      onFocus={() => setHold("focus", true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold("focus", false);
      }}
    >
      <span className="min-w-0 max-w-[18rem] break-keep [overflow-wrap:anywhere]">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className={cn(
            "focus-ring shrink-0 rounded-full px-2 py-0.5 font-semibold underline-offset-2 hover:underline",
            plain ? "text-accent-300" : "text-white",
          )}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("close")}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
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
