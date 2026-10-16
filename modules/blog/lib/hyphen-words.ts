export type TitlePart = { text: string; keep: boolean };

const LONGEST_KEPT = 20;

export function splitHyphenWords(title: string): TitlePart[] {
  return title
    .split(/([^\s-]+(?:-[^\s-]+)+)/)
    .filter((text) => text.length > 0)
    .map((text) => ({ text, keep: text.length <= LONGEST_KEPT && /^[^\s-]+(?:-[^\s-]+)+$/.test(text) }));
}
