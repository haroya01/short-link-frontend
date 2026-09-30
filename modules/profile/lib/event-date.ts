/**
 * Intl's {@code timeZone} option only accepts IANA names, not raw offsets like {@code +09:00}.
 * We map common offsets to "UTC" suffixed names that all browsers support. For exotic offsets
 * we fall back to Etc/GMT (sign-inverted per POSIX convention).
 */
export function offsetToIana(offset: string): string {
  if (offset === "Z" || offset === "+00:00") return "UTC";
  const m = offset.match(/^([+\-])(\d{2}):?(\d{2})$/);
  if (!m) return "UTC";
  const sign = m[1] === "+" ? "-" : "+"; // Etc/GMT is sign-inverted
  const hours = parseInt(m[2], 10);
  const minutes = parseInt(m[3], 10);
  if (minutes !== 0) {
    // Half-hour zones (e.g. India +05:30) — fall back to UTC; we can revisit if it matters.
    return "UTC";
  }
  return `Etc/GMT${sign}${hours}`;
}
