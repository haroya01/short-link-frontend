import { Node, mergeAttributes } from "@tiptap/core";
import { isImageUrl, planEmbed } from "@/modules/blog/lib/post-embed";
import { kurlShortCode } from "@/modules/blog/lib/kurl-link";

const BARE_URL = /^https?:\/\/\S+$/;

/**
 * The link card block's schema and markdown contract, without its React view (LinkCardNode adds it).
 * A card serializes to the bare URL on its own line (→ EMBED block → the published card); a link
 * alone on a line serializes as `<url>` or `[text](url)` and stays a link. On load only a plain-text
 * bare URL paragraph (no <a>) becomes a card. markdownToBlocks and the backend's MarkdownBlockParser
 * hold the same line.
 */
export const LinkCardBase = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { url: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-link-card]",
        getAttrs: (el) => ({ url: (el as HTMLElement).getAttribute("data-url") || "" }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-link-card": "", "data-url": HTMLAttributes.url }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void; closeBlock: (n: unknown) => void }, node: { attrs: { url: string } }) {
          state.write(node.attrs.url || "");
          state.closeBlock(node);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll(":scope > p").forEach((p) => {
              const url = p.textContent?.trim() ?? "";
              if (p.children.length > 0 || !BARE_URL.test(url) || isImageUrl(url)) return;
              if (!kurlShortCode(url) && !planEmbed(url)) return;
              const card = element.ownerDocument.createElement("div");
              card.setAttribute("data-link-card", "");
              card.setAttribute("data-url", url);
              p.replaceWith(card);
            });
          },
        },
      },
    };
  },
});
