const SHORT_CODE = /^[0-9A-Za-z]{3,16}$/;

// Must accept exactly what the backend's LinkReference.shortCodeOf accepts.
export function shortCodeOf(input: string): string | null {
  let rest = input.trim();
  const scheme = rest.indexOf("://");
  if (scheme >= 0) rest = rest.slice(scheme + 3);
  const slash = rest.indexOf("/");
  const path = slash >= 0 ? rest.slice(slash + 1) : rest;
  let end = path.length;
  for (const stop of ["/", "?", "#", "+"]) {
    const at = path.indexOf(stop);
    if (at >= 0 && at < end) end = at;
  }
  const code = path.slice(0, end);
  return SHORT_CODE.test(code) ? code : null;
}
