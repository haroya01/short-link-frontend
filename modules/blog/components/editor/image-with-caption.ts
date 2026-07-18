import Image from "@tiptap/extension-image";

// tiptap-markdown 직렬화 state(최소 표면만 사용) — AlignableTable 과 같은 이유의 로컬 타입.
type MdState = {
  write: (s: string) => void;
  closeBlock: (n: unknown) => void;
};

/**
 * 이미지 아래에 편집 가능한 캡션(figcaption)을 보여주는 NodeView. 캡션은 노드의 `title` 속성에 저장되고
 * tiptap-markdown 이 표준 image title `![alt](url "캡션")` 로 직렬화한다 → markdownToBlocks 가 캡션으로
 * 싣고 리더가 figcaption 으로 렌더(round-trip). 폭(«wide»/«half» 등)은 기존처럼 alt 마커 + CSS 로 유지.
 */
export const ImageWithCaption = Image.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        // tiptap-markdown 기본 image 직렬화기는 인라인용이라 블록 이미지(inline:false) 뒤에 빈 줄을
        // 안 닫는다 — 바로 다음 문단이 같은 줄에 붙어 `![…](u "cap")본문` 이 되고, markdownToBlocks 의
        // "이미지만 있는 줄" 판정이 깨져 이미지가 원문 텍스트 PARAGRAPH 로 강등된다(발행 글에서 이미지
        // 소실). closeBlock 으로 블록 경계를 직접 닫는다. title 이스케이프는 blocksToMarkdown 과 동일.
        serialize(state: MdState, node: { attrs: Record<string, unknown> }) {
          const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
          const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
          const title =
            typeof node.attrs.title === "string" && node.attrs.title.trim()
              ? ` "${node.attrs.title.trim().replace(/[\\"]/g, "\\$&")}"`
              : "";
          state.write(`![${alt}](${src}${title})`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },

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
      // Enter in the caption = "이어서 본문 쓰기". blur 만 하면 포커스가 body 로 떨어져 다음 타이핑이
      // 허공에 사라진다 — 캐럿을 이미지 다음 블록으로 옮기고, 다음 블록이 없거나 글이 아니면 문단을
      // 만들어 받는다. 캡션은 여전히 한 줄(줄바꿈 없음).
      cap.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") {
            cap.blur();
            return;
          }
          const after = pos + current.nodeSize;
          const nodeAfter = editor.state.doc.nodeAt(after);
          if (nodeAfter && nodeAfter.isTextblock) {
            editor.chain().focus(after + 1).run();
          } else {
            editor.chain().insertContentAt(after, { type: "paragraph" }).focus(after + 1).run();
          }
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
