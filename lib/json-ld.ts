/** Keep user-authored text inside the JSON-LD script's raw-text boundary. */
export function serializeJsonLd(value: Record<string, unknown>): string {
  // JSON escaping alone leaves </script> intact; the HTML parser closes the tag
  // before JSON parsing. Escaping '<' preserves the data without emitting HTML.
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
