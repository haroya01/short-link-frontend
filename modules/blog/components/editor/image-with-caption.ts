import Image from "@tiptap/extension-image";

/**
 * 이미지 아래에 편집 가능한 캡션(figcaption)을 보여주는 NodeView. 캡션은 노드의 `title` 속성에 저장되고
 * tiptap-markdown 이 표준 image title `![alt](url "캡션")` 로 직렬화한다 → markdownToBlocks 가 캡션으로
 * 싣고 리더가 figcaption 으로 렌더(round-trip). 폭(«wide»/«half» 등)은 기존처럼 alt 마커 + CSS 로 유지.
 */
export const ImageWithCaption = Image.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;

      const figure = document.createElement("figure");
      figure.className = "tiptap-figure";

      const img = document.createElement("img");
      img.src = current.attrs.src;
      img.alt = current.attrs.alt ?? "";
      figure.appendChild(img);

      const cap = document.createElement("figcaption");
      cap.className = "tiptap-figcaption";
      cap.setAttribute("contenteditable", "true");
      cap.setAttribute("data-placeholder", "캡션 추가 (선택)");
      cap.textContent = current.attrs.title ?? "";
      figure.appendChild(cap);

      const commit = () => {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (typeof pos !== "number") return;
        const text = (cap.textContent ?? "").replace(/\n/g, " ");
        const title = text.trim() ? text : null;
        if (title === (current.attrs.title ?? null)) return;
        editor.view.dispatch(editor.view.state.tr.setNodeAttribute(pos, "title", title));
      };
      cap.addEventListener("input", commit);
      cap.addEventListener("blur", commit);
      // Enter in the caption shouldn't split the doc — keep captions single-line.
      cap.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          cap.blur();
        }
      });

      return {
        dom: figure,
        // The figcaption is NOT ProseMirror content (it's a node attr), so keep PM out of its events/mutations.
        ignoreMutation: (m) => m.target === cap || cap.contains(m.target as Node),
        stopEvent: (e) => e.target === cap || cap.contains(e.target as Node),
        update: (updated) => {
          if (updated.type.name !== current.type.name) return false;
          current = updated;
          if (img.getAttribute("src") !== updated.attrs.src) img.src = updated.attrs.src;
          img.alt = updated.attrs.alt ?? "";
          // Don't clobber the caret while the user is typing in the caption.
          if (document.activeElement !== cap) {
            const t = updated.attrs.title ?? "";
            if (cap.textContent !== t) cap.textContent = t;
          }
          return true;
        },
      };
    };
  },
});
