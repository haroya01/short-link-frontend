/** Languages a note can be written in (ISO 639-1). */
export const NOTE_LANGUAGES = ["ko", "ja", "en", "zh", "vi", "hi", "es", "fr", "de", "pt", "id", "th"];

/** A language named in its own script, as Mastodon lists them. */
export function languageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code;
  }
}

const KEY = "kurl:notes:language";

function saved(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The language last written in, else the page's, else Korean. */
export function postingLanguage(locale: string): string {
  const last = saved();
  if (last && NOTE_LANGUAGES.includes(last)) return last;
  const page = locale.split("-")[0];
  return NOTE_LANGUAGES.includes(page) ? page : "ko";
}

export function rememberLanguage(code: string) {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    return;
  }
}
