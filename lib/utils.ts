import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
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
