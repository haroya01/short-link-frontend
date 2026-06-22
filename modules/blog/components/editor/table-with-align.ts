import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

/**
 * 표 열 정렬(왼쪽/가운데/오른쪽)을 마크다운↔블록 왕복까지 살린다.
 *
 * tiptap-markdown 기본 표 직렬화기는 정렬을 버린다(구분행을 `| --- |` 로만 쓴다). GFM 정렬은 열 단위로
 * 구분행(`:---` 왼쪽 · `:---:` 가운데 · `---:` 오른쪽)에 인코딩되므로, 셀에 `align` 속성을 달고 표
 * 직렬화기를 갈아끼워 헤더 행의 정렬로 구분행을 직접 쓴다. 불러올 때는 markdown-it 이 정렬을
 * `style="text-align:…"` 로 렌더 → 셀의 parseHTML 이 그 style 을 다시 `align` 속성으로 읽어 복원한다.
 * TABLE 블록은 GFM 원문을 통째로 보존하고 리더(remark-gfm)도 정렬을 그대로 렌더하므로, 저장·발행 모두
 * 일관된다.
 */
export type ColumnAlign = "left" | "center" | "right";

const ALIGN_ATTR = {
  align: {
    default: null as ColumnAlign | null,
    parseHTML: (el: HTMLElement): ColumnAlign | null => {
      const a = el.style.textAlign || el.getAttribute("align") || "";
      return a === "left" || a === "center" || a === "right" ? a : null;
    },
    renderHTML: (attrs: { align?: ColumnAlign | null }) =>
      attrs.align ? { style: `text-align:${attrs.align}` } : {},
  },
};

export const AlignableTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...ALIGN_ATTR };
  },
});

export const AlignableTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...ALIGN_ATTR };
  },
});

function separatorFor(align: ColumnAlign | null | undefined): string {
  switch (align) {
    case "center":
      return ":---:";
    case "right":
      return "---:";
    case "left":
      return ":---";
    default:
      return "---";
  }
}

// tiptap-markdown 직렬화 state(최소 표면만 사용). renderInline 은 셀의 인라인 내용을 스트림에 쓴다.
type MdState = {
  write: (s: string) => void;
  ensureNewLine: () => void;
  closeBlock: (n: unknown) => void;
  renderInline: (node: unknown) => void;
};
type PMNodeLike = {
  attrs: { align?: ColumnAlign | null };
  firstChild: unknown;
  forEach: (fn: (child: PMNodeLike, offset: number, index: number) => void) => void;
};

export const AlignableTable = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: MdState, node: PMNodeLike) {
          node.forEach((row, _o, rowIndex) => {
            state.write("| ");
            row.forEach((cell, _c, colIndex) => {
              if (colIndex > 0) state.write(" | ");
              // 셀은 단일 문단을 담는다(GFM 셀=인라인). 그 인라인 내용만 스트림에 쓴다.
              state.renderInline(cell.firstChild ?? cell);
            });
            state.write(" |");
            state.ensureNewLine();
            if (rowIndex === 0) {
              const seps: string[] = [];
              row.forEach((cell) => seps.push(separatorFor(cell.attrs.align)));
              state.write("| " + seps.join(" | ") + " |");
              state.ensureNewLine();
            }
          });
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});
