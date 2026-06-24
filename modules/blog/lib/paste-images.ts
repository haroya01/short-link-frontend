/**
 * Pull external (http/https) image URLs out of pasted HTML, and report whether the HTML carries any
 * real text besides the images.
 *
 * The editor's paste handler uses this to tell "just image(s)" pastes (e.g. an image copied from
 * Notion, whose clipboard is `text/html` with an `<img src="https…">` and no bytes) apart from a
 * mixed rich paste. The former is safe to intercept and re-host; the latter should fall through to
 * the default markdown handler so its text isn't lost.
 */
export function externalImageUrlsFromHtml(html: string): {
  urls: string[];
  textIsEmpty: boolean;
} {
  if (typeof window === "undefined" || !html) return { urls: [], textIsEmpty: true };
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return { urls: [], textIsEmpty: true };
  }
  const urls = Array.from(doc.querySelectorAll("img"))
    .map((img) => img.getAttribute("src")?.trim() ?? "")
    .filter((src) => /^https?:\/\//i.test(src));
  const textIsEmpty = (doc.body?.textContent ?? "").trim().length === 0;
  return { urls, textIsEmpty };
}
