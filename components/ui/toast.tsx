"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  message: string;
  variant?: "default" | "success" | "error";
};

type ToastContextValue = {
  toast: (message: string, variant?: Toast["variant"]) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);
const MAX_STACK = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
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
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex animate-fade-in items-center gap-3 rounded-full pl-4 pr-2 py-2 text-sm shadow-lg",
              t.variant === "success" && "bg-accent-600 text-white",
              t.variant === "error" && "bg-red-600 text-white",
              (!t.variant || t.variant === "default") && "bg-slate-900 text-white",
            )}
            role="status"
            aria-live="polite"
          >
            <span className="max-w-[18rem] truncate">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="dismiss"
              className="grid h-5 w-5 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
