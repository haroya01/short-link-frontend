import Link from "@tiptap/extension-link";

/** CommentBody only linkifies `[text](https?://…)`, so a link whose text is its own address must not
 *  serialize as the `<https://…>` autolink tiptap-markdown writes by default. */
export const CommentLink = Link.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize: {
          open: "[",
          close: (_state: unknown, mark: { attrs: { href: string } }) => `](${mark.attrs.href.replace(/[()"]/g, "\\$&")})`,
          mixable: true,
        },
      },
    };
  },
});
