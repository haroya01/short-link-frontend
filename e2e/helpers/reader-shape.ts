type Block = { type: string; content: string | null };
type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

const FORMAT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "del", "code", "pre", "blockquote", "li", "a", "th", "td", "img"]);

function listMarkdown(content: string, ordered: boolean): string {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.map((x, i) => `${ordered ? `${i + 1}.` : "-"} ${x}`).join("\n");
  } catch {}
  return content;
}

function blockMarkdown(b: Block): string {
  const c = b.content ?? "";
  switch (b.type) {
    case "H1":
    case "H2":
    case "H3":
      return `### ${c}`;
    case "QUOTE":
      return c.split("\n").map((l) => `> ${l}`).join("\n");
    case "LIST_BULLET":
      return listMarkdown(c, false);
    case "LIST_NUMBERED":
      return listMarkdown(c, true);
    case "DIVIDER":
      return "---";
    case "CODE":
      try {
        const j = JSON.parse(c);
        return "```\n" + String(j.code ?? "").replace(/\s+$/, "") + "\n```";
      } catch {
        return "```\n" + c + "\n```";
      }
    case "IMAGE":
      try {
        const j = JSON.parse(c);
        return `![](${j.url})`;
      } catch {
        return `![](${c.trim()})`;
      }
    case "EMBED":
      try {
        const j = JSON.parse(c);
        if (j && typeof j.url === "string") return `<${j.url}>`;
      } catch {}
      return `<${c.trim()}>`;
    default:
      return c;
  }
}

export async function readerShape(blocks: Block[]): Promise<string[]> {
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }, { default: remarkCjkFriendly }, { default: remarkRehype }] =
    await Promise.all([import("unified"), import("remark-parse"), import("remark-gfm"), import("remark-cjk-friendly"), import("remark-rehype")]);
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkCjkFriendly).use(remarkRehype, { allowDangerousHtml: true });
  const runs: string[] = [];
  for (const block of blocks) {
    const tree = processor.runSync(processor.parse(blockMarkdown(block))) as HastNode;
    const walk = (node: HastNode, ctx: string[]) => {
      if (node.type === "text") {
        const text = (node.value ?? "").replace(/[\p{P}\p{S}\s]/gu, "");
        let tags = [...new Set(ctx)];
        if (tags.includes("code")) tags = tags.filter((t) => !["strong", "em", "del"].includes(t));
        if (tags.includes("pre")) tags = tags.filter((t) => t !== "li");
        if (text) runs.push(`${tags.sort().join(",")}|${text}`);
        return;
      }
      if (node.type === "raw") {
        const text = (node.value ?? "").replace(/[\p{P}\p{S}\s]/gu, "");
        if (text) runs.push(`${[...new Set(ctx)].sort().join(",")}|${text}`);
        return;
      }
      if (node.type === "element" && node.tagName === "hr") runs.push("hr");
      if (node.type === "element" && node.tagName === "img") runs.push(`img|${String(node.properties?.src ?? "")}`);
      const next = node.type === "element" && node.tagName && FORMAT_TAGS.has(node.tagName) ? [...ctx, node.tagName.replace(/^h[1-6]$/, "h")] : ctx;
      for (const child of node.children ?? []) walk(child, next);
    };
    walk(tree, []);
  }
  return mergeAdjacent(runs);
}

function mergeAdjacent(runs: string[]): string[] {
  const out: string[] = [];
  for (const run of runs) {
    const prev = out[out.length - 1];
    const [pf, ...pt] = prev?.split("|") ?? [];
    const [rf, ...rt] = run.split("|");
    if (prev && pf === rf && pf !== "hr" && pf !== "img") out[out.length - 1] = `${pf}|${pt.join("|")}${rt.join("|")}`;
    else out.push(run);
  }
  return out;
}
