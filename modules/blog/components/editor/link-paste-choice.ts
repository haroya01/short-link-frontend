import { Extension, type Editor } from "@tiptap/core";
import type { PastePlan, PasteSpot } from "@/modules/blog/lib/link-paste";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

export type LinkChoice = { from: number; to: number; href: string; video: boolean };

type Meta = { show: LinkChoice } | { hide: true };

export const linkChoiceKey = new PluginKey<LinkChoice | null>("linkPasteChoice");

const isBreak = (node: { type: { name: string } } | null | undefined) => !node || node.type.name === "hardBreak";

export function pasteSpot(state: EditorState): PasteSpot {
  const { $from, empty } = state.selection;
  return {
    selection: !empty,
    emptyLine: empty && $from.parent.type.name === "paragraph" && isBreak($from.nodeBefore) && isBreak($from.nodeAfter),
    code: !!$from.parent.type.spec.code || $from.marks().some((mark) => mark.type.name === "code"),
  };
}

export function applyPastePlan(editor: Editor, plan: PastePlan): boolean {
  if (plan.kind === "default") return false;
  if (plan.kind === "link-selection") {
    return editor
      .chain()
      .focus()
      .command(({ tr }) => !!closeHistory(tr))
      .setLink({ href: plan.href })
      .run();
  }
  const from = editor.state.selection.from;
  return editor
    .chain()
    .focus()
    .command(({ tr }) => !!closeHistory(tr))
    .insertContent({ type: "text", text: plan.href, marks: [{ type: "link", attrs: { href: plan.href } }] })
    .unsetMark("link")
    .command(({ tr }) => {
      if (plan.kind === "link-with-choice") {
        tr.setMeta(linkChoiceKey, { show: { from, to: from + plan.href.length, href: plan.href, video: plan.video } } satisfies Meta);
      }
      return true;
    })
    .run();
}

export function convertChoiceToCard(view: EditorView): boolean {
  const choice = linkChoiceKey.getState(view.state);
  const card = view.state.schema.nodes.linkCard;
  if (!choice || !card) return false;
  const { doc } = view.state;
  const before = doc.resolve(choice.from).nodeBefore;
  const after = doc.resolve(choice.to).nodeAfter;
  const start = before?.type.name === "hardBreak" ? choice.from - before.nodeSize : choice.from;
  const end = after?.type.name === "hardBreak" ? choice.to + after.nodeSize : choice.to;
  const tr = view.state.tr.replaceRangeWith(start, end, card.create({ url: choice.href }));
  view.dispatch(closeHistory(tr).setMeta(linkChoiceKey, { hide: true } satisfies Meta));
  view.focus();
  return true;
}

function hide(view: EditorView) {
  view.dispatch(view.state.tr.setMeta(linkChoiceKey, { hide: true } satisfies Meta));
  view.focus();
}

export const LinkPasteChoice = Extension.create<{ labels: { group: string; link: string; card: string; video: string } }>({
  name: "linkPasteChoice",

  addOptions() {
    return { labels: { group: "", link: "", card: "", video: "" } };
  },

  addProseMirrorPlugins() {
    const { labels } = this.options;
    return [
      new Plugin<LinkChoice | null>({
        key: linkChoiceKey,
        state: {
          init: () => null,
          apply(tr, value, _old, state) {
            const meta = tr.getMeta(linkChoiceKey) as Meta | undefined;
            if (meta) return "show" in meta ? meta.show : null;
            if (!value || tr.docChanged) return null;
            const { from, empty } = state.selection;
            return empty && from >= value.from && from <= value.to ? value : null;
          },
        },
        props: {
          decorations(state) {
            const choice = linkChoiceKey.getState(state);
            if (!choice) return null;
            const widget = Decoration.widget(
              choice.to,
              (view) => {
                const group = document.createElement("span");
                group.setAttribute("data-link-choice", "");
                group.setAttribute("role", "group");
                group.setAttribute("aria-label", labels.group);
                group.contentEditable = "false";
                group.className =
                  "link-choice ml-2 inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 align-middle text-[12px] font-medium shadow-sm dark:border-slate-700 dark:bg-slate-900";
                const option = (label: string, pressed: boolean, run: () => void) => {
                  const button = document.createElement("button");
                  button.type = "button";
                  button.textContent = label;
                  button.setAttribute("aria-pressed", String(pressed));
                  button.className = pressed
                    ? "rounded-full bg-slate-900 px-2.5 py-0.5 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "rounded-full px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
                  button.addEventListener("mousedown", (e) => e.preventDefault());
                  button.addEventListener("click", (e) => {
                    e.preventDefault();
                    run();
                  });
                  return button;
                };
                group.append(
                  option(labels.link, true, () => hide(view)),
                  option(choice.video ? labels.video : labels.card, false, () => convertChoiceToCard(view)),
                );
                return group;
              },
              { side: 1, ignoreSelection: true, stopEvent: () => true, key: `link-choice-${choice.from}-${choice.href}` },
            );
            return DecorationSet.create(state.doc, [widget]);
          },
          handleKeyDown(view, event) {
            if (event.key !== "Escape" || !linkChoiceKey.getState(view.state)) return false;
            hide(view);
            return true;
          },
        },
      }),
    ];
  },
});
