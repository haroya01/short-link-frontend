import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** React 18 drops a boolean `inert`; the attribute only reaches the DOM as an empty string. */
export function inert(on: boolean): { inert?: boolean } {
  return on ? ({ inert: "" } as unknown as { inert: boolean }) : {};
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

/** formatDate plus the local 24h time, for logs and "last seen" stamps. */
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  return `${formatDate(iso)} ${time}`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

/** A part of a whole (0–1) as a percent: whole numbers from 10%, one decimal below it so small
 *  slices stay distinguishable. */
export function formatShare(ratio: number) {
  const pct = ratio * 100;
  if (pct === 0) return "0%";
  return `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

export function formatPercent(ratio: number, fractionDigits = 1) {
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${(ratio * 100).toFixed(fractionDigits)}%`;
}

export function truncateMiddle(s: string, max = 60) {
  if (s.length <= max) return s;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function countryName(code: string, locale = "ko") {
  const normalized = code.toUpperCase();
  if (normalized === "ZZ") return normalized;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

export function countryFlag(code: string) {
  if (code.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + code.toUpperCase().charCodeAt(0) - a,
    A + code.toUpperCase().charCodeAt(1) - a,
  );
}
