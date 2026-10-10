const BLOCKS = "p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, aside[data-callout], .prose-table-wrap";
const CONTAINERS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "BLOCKQUOTE"]);
const STRUCTURE = new Set(["UL", "OL", "P", "PRE", "IMG", "INPUT", "TABLE", "BLOCKQUOTE", "FIGURE", "DIV"]);

type Container = { el: HTMLElement; nodes: ChildNode[] };
type Entry = { original: HTMLElement; clone: HTMLElement; containers: Container[] };

function ownNodes(el: HTMLElement): ChildNode[] {
  return Array.from(el.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE || (node instanceof HTMLElement && !STRUCTURE.has(node.tagName)),
  );
}

function textOf(nodes: ChildNode[]): string {
  return nodes
    .map((node) => node.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function containersIn(root: HTMLElement): Container[] {
  return [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]
    .filter((el) => CONTAINERS.has(el.tagName) && !el.closest("pre") && !(el.tagName === "P" && el.querySelector("img")))
    .map((el) => ({ el, nodes: ownNodes(el) }))
    .filter((container) => textOf(container.nodes) !== "");
}

function scrub(root: HTMLElement) {
  for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    el.removeAttribute("id");
    for (const name of el.getAttributeNames()) if (name.startsWith("data-")) el.removeAttribute(name);
  }
}

/**
 * Pairs each translatable block of a server-rendered post with a clone whose text runs become the
 * translation as plain text. The originals stay in place, only hidden, because React still owns them.
 */
export function preparePostTranslation(title: HTMLElement | null, body: HTMLElement | null) {
  const candidates = [
    ...(title ? [title] : []),
    ...Array.from(body?.children ?? []).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.matches(BLOCKS) && !el.hasAttribute("data-translation"),
    ),
  ];
  const entries: Entry[] = candidates.flatMap((original) => {
    const clone = original.cloneNode(true) as HTMLElement;
    const containers = containersIn(clone);
    return containers.length > 0 ? [{ original, clone, containers }] : [];
  });
  const texts = entries.flatMap((entry) => entry.containers.map((container) => textOf(container.nodes)));

  function apply(translated: readonly string[], lang: string): () => void {
    if (translated.length !== texts.length) throw new Error("translation count mismatch");
    let next = 0;
    for (const { original, clone, containers } of entries) {
      for (const { el, nodes } of containers) {
        el.insertBefore(document.createTextNode(translated[next++]), nodes[0] ?? null);
        for (const node of nodes) node.remove();
      }
      scrub(clone);
      clone.setAttribute("data-translation", "");
      clone.lang = lang;
      original.after(clone);
      original.hidden = true;
    }
    return () => {
      for (const { original, clone } of entries) {
        clone.remove();
        original.hidden = false;
      }
    };
  }

  return { texts, apply };
}
