import { getMarkRange, type Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import type { LinkDialogRequest, LinkDialogResult } from "@/modules/blog/components/editor/link-dialog";

export type LinkRange = { from: number; to: number };
export type OpenedLink = { request: LinkDialogRequest; range: LinkRange | null };
export type LinkAt = LinkRange & { href: string; rect: DOMRect };

export function linkRequest(
  editor: Editor,
  mode: "link" | "card",
  edit: (LinkRange & { href: string }) | null,
  { cards }: { cards: boolean },
): OpenedLink {
  const { from, to, empty, $from } = editor.state.selection;
  const inLink = editor.isActive("link") ? getMarkRange($from, editor.schema.marks.link) : undefined;
  const span = edit ? { from: edit.from, to: edit.to } : (inLink ?? (empty ? null : { from, to }));
  const href = edit?.href ?? ((editor.getAttributes("link").href as string | undefined) ?? "");
  const caret = editor.view.coordsAtPos(span?.from ?? from);
  return {
    range: span,
    request: {
      mode,
      text: span ? editor.state.doc.textBetween(span.from, span.to, " ") : "",
      href,
      canPickCard: cards && !span,
      editing: !!href,
      anchor: { left: caret.left, top: caret.top, bottom: caret.bottom },
    },
  };
}

export function applyLinkResult(editor: Editor, result: LinkDialogResult, opened: OpenedLink) {
  if (result.mode === "card") {
    editor.chain().focus().insertContent({ type: "linkCard", attrs: { url: result.href } }).run();
    return;
  }
  const link = { type: "link", attrs: { href: result.href } };
  const { range, request } = opened;
  if (range && result.text && result.text !== request.text) {
    editor.chain().focus().insertContentAt(range, { type: "text", text: result.text, marks: [link] }).unsetMark("link").run();
  } else if (range) {
    editor.chain().focus().setTextSelection(range).setLink({ href: result.href }).run();
  } else {
    editor.chain().focus().insertContent({ type: "text", text: result.text || result.href, marks: [link] }).unsetMark("link").run();
  }
}

export function linkAt(view: EditorView, pos: number, event: MouseEvent): LinkAt | null {
  const anchor = (event.target as HTMLElement | null)?.closest?.("a");
  const range = anchor ? getMarkRange(view.state.doc.resolve(pos), view.state.schema.marks.link) : undefined;
  if (!anchor || !range) return null;
  return { href: anchor.getAttribute("href") ?? "", from: range.from, to: range.to, rect: anchor.getBoundingClientRect() };
}
