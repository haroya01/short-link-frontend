import { Extension, textblockTypeInputRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import type MarkdownIt from "markdown-it";
import cjkFriendly from "markdown-it-cjk-friendly";

type SerializerState = {
  write: (s?: string) => void;
  text: (s: string) => void;
  delim: string;
  out: string;
  inTable?: boolean;
  inlines?: { start: number; delimiter: unknown }[];
};
type PMNode = { type: unknown; text?: string };
type PMParent = { childCount: number; child: (i: number) => PMNode };

export function escapeTagLike(text: string): string {
  return text.replace(/<(?=[A-Za-z/!?])/g, "&lt;");
}

export const MarkdownText = Text.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: SerializerState, node: PMNode) {
          state.text(escapeTagLike(node.text ?? ""));
        },
        parse: {},
      },
    };
  },
});

export const MarkdownHardBreak = HardBreak.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: SerializerState, node: PMNode, parent: PMParent, index: number) {
          if (state.inTable) return;
          for (let i = index + 1; i < parent.childCount; i++) {
            if (parent.child(i).type !== node.type) {
              state.write("\\\n");
              return;
            }
          }
        },
        parse: {},
      },
    };
  },
});

function delimiterSafe(marker: string) {
  return {
    open(state: SerializerState) {
      state.write();
      const top = state.inlines?.[state.inlines.length - 1];
      if (top) {
        top.start = state.out.length;
        top.delimiter = marker;
      }
      return marker;
    },
    close: marker,
    mixable: true,
    expelEnclosingWhitespace: true,
  };
}

export const MarkdownBold = Bold.extend({
  addStorage() {
    return { markdown: { serialize: delimiterSafe("**"), parse: {} } };
  },
});

export const MarkdownItalic = Italic.extend({
  addStorage() {
    return { markdown: { serialize: delimiterSafe("*"), parse: {} } };
  },
});

export const MarkdownStrike = Strike.extend({
  addStorage() {
    return { markdown: { serialize: { ...delimiterSafe("~~"), mixable: false }, parse: {} } };
  },
});

export const MarkdownHeading = Heading.extend({
  addInputRules() {
    return [1, 2, 3].map((level) =>
      textblockTypeInputRule({ find: new RegExp(`^(#{${level}})\\s$`), type: this.type, getAttributes: { level } }),
    );
  },
}).configure({ levels: [1, 2, 3, 4, 5, 6] });

export const TightTaskLists = Extension.create({
  name: "tightTaskLists",
  addGlobalAttributes() {
    return [
      {
        types: ["taskList"],
        attributes: {
          tight: {
            default: true,
            parseHTML: (element: HTMLElement) => !element.querySelector("p"),
            renderHTML: () => ({}),
          },
        },
      },
    ];
  },
});

export const CjkFriendlyMarkdown = Extension.create({
  name: "cjkFriendlyMarkdown",
  addStorage() {
    return {
      markdown: {
        parse: {
          setup(markdownit: MarkdownIt) {
            markdownit.use(cjkFriendly);
          },
        },
      },
    };
  },
});
