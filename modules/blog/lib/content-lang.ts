const KANA = /[぀-ヿｦ-ﾟ]/g;
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/g;

/**
 * `lang` for a run of author-written text that sits on a page in another language — a post title in
 * a feed, a series name in a rail. Line breaking and glyph selection both follow `lang` (globals.css
 * `:lang()` rules), so a Japanese title left on a Korean page inherits keep-all and Korean kanji forms.
 * Kana or hangul in the text decide; text with neither (Latin, kanji only) takes the language the
 * author declared for the post, and stays unmarked when there is none.
 */
export function contentLang(
  text: string | null | undefined,
  declared?: string | null,
): string | undefined {
  const kana = text?.match(KANA)?.length ?? 0;
  const hangul = text?.match(HANGUL)?.length ?? 0;
  if (kana > hangul) return "ja";
  if (hangul > 0) return "ko";
  return declared || undefined;
}
