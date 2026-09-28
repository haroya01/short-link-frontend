import { Extension } from "@tiptap/core";
import { dropCursor } from "@tiptap/pm/dropcursor";

/**
 * StarterKit's drop line, removed together with its plugin view. ProseMirror rebuilds every plugin
 * view whenever a plugin is registered — the image bubble menu registers one the moment a dragged image
 * becomes selected — and prosemirror-dropcursor's destroy() detaches its listeners without removing the
 * line it already drew, so that line stayed on the page until a reload.
 */
export const DropCursorLine = Extension.create({
  name: "dropCursorLine",
  addProseMirrorPlugins() {
    const plugin = dropCursor({ color: "#059669", width: 2 });
    const createView = plugin.spec.view;
    if (createView) {
      plugin.spec.view = (view) => {
        const cursor: ReturnType<typeof createView> & { element?: HTMLElement | null } = createView(view);
        const destroy = cursor.destroy?.bind(cursor);
        cursor.destroy = () => {
          destroy?.();
          cursor.element?.remove();
        };
        return cursor;
      };
    }
    return [plugin];
  },
});
