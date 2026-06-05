"use client";

import type { Element, Root } from "hast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/**
 * Shared markdown renderer for the public reader. Post text blocks store raw markdown (the editor
 * authors markdown and the backend keeps it per-block), so inline formatting / code fences / GFM
 * tables only render correctly through this.
 *
 * Inline color / highlight from the editor are authored as `<span style="color|background-color">`
 * and `<mark>`, so we DO allow a tightly-scoped slice of raw HTML — but safely:
 *   rehypeRaw (parse) → safeStyle (drop every CSS declaration except color / background-color with
 *   a literal color value — kills url()/expression/etc.) → rehypeHighlight → rehypeSanitize
 *   (whitelist: only span/mark add class+style; everything else is the conservative default, so
 *   scripts / iframes / event handlers are stripped).
 */
const SAFE_STYLE_DECL =
  /^(color|background-color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%]+\)|[a-zA-Z]+)$/;

/** Keep only color / background-color style declarations with a literal color value. */
function rehypeSafeStyle() {
  return (tree: Root) => {
    const walk = (node: Element | Root) => {
      if ("properties" in node && node.properties && node.properties.style != null) {
        const safe = String(node.properties.style)
          .split(";")
          .map((d) => d.trim())
          .filter((d) => SAFE_STYLE_DECL.test(d));
        if (safe.length) node.properties.style = safe.join("; ");
        else delete node.properties.style;
      }
      if ("children" in node) {
        for (const child of node.children) {
          if (child.type === "element") walk(child);
        }
      }
    };
    walk(tree);
  };
}

// Allow span/mark to carry className (hljs spans) + a style (already value-filtered above);
// keep className on code/pre for syntax highlighting. Everything else stays on the safe default.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "span", "mark"],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "className", "style"],
    mark: ["className", "style"],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className"],
  },
};

export function Markdown({ children, inline = false }: { children: string; inline?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={
        inline
          ? [rehypeRaw, rehypeSafeStyle, [rehypeSanitize, schema]]
          : [rehypeRaw, rehypeSafeStyle, rehypeHighlight, [rehypeSanitize, schema]]
      }
      components={
        inline
          ? { p: ({ children }) => <>{children}</> }
          : {
              // Wrap tables so a too-wide one scrolls within the reading column instead of squishing
              // its cells unreadably on a phone (the .prose-post table CSS only sets w-full).
              table: ({ children, className }) => (
                <div className="prose-table-wrap">
                  <table className={className}>{children}</table>
                </div>
              ),
            }
      }
    >
      {children}
    </ReactMarkdown>
  );
}
