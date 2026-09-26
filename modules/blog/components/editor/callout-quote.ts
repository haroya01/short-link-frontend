import { mergeAttributes } from "@tiptap/core";
import Blockquote, { type BlockquoteOptions } from "@tiptap/extension-blockquote";
import { calloutMarker, CALLOUT_KINDS, type CalloutKind } from "@/modules/blog/lib/callout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind: CalloutKind) => ReturnType;
    };
  }
}

type SerializerState = {
  wrapBlock: (delim: string, firstDelim: string | null, node: unknown, f: () => void) => void;
  write: (s?: string) => void;
  ensureNewLine: () => void;
  renderContent: (node: unknown) => void;
};

const MARKER = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;

export function markCalloutQuotes(element: HTMLElement) {
  element.querySelectorAll("blockquote").forEach((quote) => {
    const para = quote.firstElementChild;
    if (!para || para.tagName !== "P") return;
    const first = para.firstChild;
    if (!first || first.nodeType !== 3) return;
    const match = (first.textContent ?? "").match(MARKER);
    if (!match) return;
    const next = first.nextSibling;
    first.remove();
    if (next?.nodeName === "BR") next.remove();
    const lead = para.firstChild;
    if (lead?.nodeType === 3) lead.textContent = (lead.textContent ?? "").replace(/^\n/, "");
    if (!para.textContent?.trim() && para.children.length === 0) para.remove();
    quote.setAttribute("data-alert", match[1].toLowerCase());
  });
}

export const CalloutQuote = Blockquote.extend<BlockquoteOptions & { labels: Record<CalloutKind, string> }>({
  addOptions() {
    return {
      ...this.parent!(),
      labels: Object.fromEntries(CALLOUT_KINDS.map((k) => [k, k])) as Record<CalloutKind, string>,
    };
  },

  addAttributes() {
    return {
      alert: {
        default: null,
        parseHTML: (el) => {
          const kind = el.getAttribute("data-alert");
          return kind && (CALLOUT_KINDS as readonly string[]).includes(kind) ? kind : null;
        },
        renderHTML: (attrs) => (attrs.alert ? { "data-alert": attrs.alert } : {}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = node.attrs.alert as CalloutKind | null;
    return [
      "blockquote",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, kind ? { "data-label": this.options.labels[kind] } : {}),
      0,
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setCallout:
        (kind) =>
        ({ commands, chain }) =>
          this.editor.isActive(this.name)
            ? commands.updateAttributes(this.name, { alert: kind })
            : chain().wrapIn(this.name, { alert: kind }).run(),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: SerializerState, node: { attrs: { alert: CalloutKind | null } }) {
          state.wrapBlock("> ", null, node, () => {
            if (node.attrs.alert) {
              state.write(calloutMarker(node.attrs.alert));
              state.ensureNewLine();
            }
            state.renderContent(node);
          });
        },
        parse: {
          updateDOM: markCalloutQuotes,
        },
      },
    };
  },
});
