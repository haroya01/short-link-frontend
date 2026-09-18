/** Empty-or-whitespace string → null. Used to map "clear the OG override" into a null payload. */
export function blankToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * ISO-8601 → datetime-local input value (YYYY-MM-DDTHH:mm) in the user's local timezone.
 * The native control round-trips back to ISO via {@code new Date(value).toISOString()}.
 */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type Section = "basic" | "tags" | "og" | "protection";

/** Explicit expiry clearing; unchanged minute inputs preserve the original second precision. */
export function buildExpiryPatch(previous: string | null, input: string): { expiresAt?: string | null; clearExpiresAt?: boolean } {
  if (previous ? input === toLocalInput(previous) : !input) return {};
  if (!input) return { expiresAt: null, clearExpiresAt: true };
  return { expiresAt: new Date(input).toISOString() };
}
