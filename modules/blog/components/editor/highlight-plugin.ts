/**
 * Toast UI Editor plugin: 형광펜 (highlight). The built-in color-syntax plugin is text-color only,
 * so this adds a one-click highlight that wraps the selection in
 * `<span style="background-color: …">`.
 *
 * It mirrors how color-syntax applies inline style — via a ProseMirror transaction
 * (`schema.marks.span` + `tr.addMark` in WYSIWYG, a wrapped `<span>` in markdown mode) rather than
 * `replaceSelection`, which Toast UI would escape into literal `\<span>` text. The public reader's
 * safe-style pass keeps `background-color` and sanitizes the rest.
 */
const HIGHLIGHT = "#fef08a"; // amber-200 — classic marker yellow

type MarkdownCtx = {
  tr: {
    replaceSelectionWith: (node: unknown) => unknown;
    addMark: (from: number, to: number, mark: unknown) => unknown;
  };
  selection: {
    from: number;
    to: number;
    content: () => {
      content: { size: number; textBetween: (a: number, b: number, sep: string) => string };
    };
  };
  schema: {
    text: (s: string) => unknown;
    marks: { span?: { create: (attrs: unknown) => unknown } };
  };
};

type Dispatch = (tr: unknown) => void;
type Command = (payload: unknown, ctx: MarkdownCtx, dispatch: Dispatch) => boolean;

export function highlightPlugin() {
  const markdownHighlight: Command = (_payload, { tr, selection, schema }, dispatch) => {
    const slice = selection.content();
    const text = slice.content.textBetween(0, slice.content.size, "\n");
    if (!text) return false;
    const wrapped = `<span style="background-color: ${HIGHLIGHT}">${text}</span>`;
    tr.replaceSelectionWith(schema.text(wrapped));
    dispatch(tr);
    return true;
  };

  const wysiwygHighlight: Command = (_payload, { tr, selection, schema }, dispatch) => {
    const { from, to } = selection;
    if (from === to || !schema.marks.span) return false;
    const mark = schema.marks.span.create({
      htmlAttrs: { style: `background-color: ${HIGHLIGHT}` },
    });
    tr.addMark(from, to, mark);
    dispatch(tr);
    return true;
  };

  // The toolbar button is added in markdown-editor.tsx (via editor.exec("highlight")) so it can
  // reach the editor instance — a plugin `toolbarItems` command binding didn't fire reliably.
  return {
    markdownCommands: { highlight: markdownHighlight },
    wysiwygCommands: { highlight: wysiwygHighlight },
    toHTMLRenderers: {
      htmlInline: {
        span: (node: { attrs: unknown }, { entering }: { entering: boolean }) =>
          entering
            ? { type: "openTag", tagName: "span", attributes: node.attrs }
            : { type: "closeTag", tagName: "span" },
      },
    },
  };
}
