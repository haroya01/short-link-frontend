import type { Element, Root } from "hast";
import type { Parent as MdastParent, PhrasingContent, Root as MdastRoot } from "mdast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { POST_COLUMN_SIZES, parseImageAlt } from "@/modules/blog/lib/image-width";
import { VariantImage } from "@/components/common/variant-image";

/**
 * Shared markdown renderer for the public reader. Post text blocks store raw markdown (the editor
 * authors markdown and the backend keeps it per-block), so inline formatting / code fences / GFM
 * tables only render correctly through this.
 *
 * Inline color / highlight from the editor are authored as `<span style="color|background-color">`
 * and `<mark>`, so we DO allow a tightly-scoped slice of raw HTML — but safely:
 *   rehypeRaw (parse) → safeStyle (drop every CSS declaration except color / background-color with
 *   a literal color value — kills url()/expression/etc.) → rehypeSanitize (whitelist: only span/mark
 *   add style; no author-supplied class survives, so scripts / iframes / event handlers / utility-class
 *   overlays are stripped) → rehypeHighlight (adds its own hljs classes after sanitizing).
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

function remarkNewlineBreaks() {
  return (tree: MdastRoot) => {
    const walk = (node: MdastParent) => {
      const next: MdastParent["children"] = [];
      for (const child of node.children) {
        if (child.type === "text" && child.value.includes("\n")) {
          child.value.split("\n").forEach((part, i) => {
            if (i > 0) next.push({ type: "break" } as PhrasingContent);
            if (part) next.push({ type: "text", value: part });
          });
          continue;
        }
        if ("children" in child) walk(child as MdastParent);
        next.push(child);
      }
      node.children = next;
    };
    walk(tree);
  };
}

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "span", "mark"],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "style"],
    mark: ["style"],
  },
};

export function Markdown({ children, inline = false }: { children: string; inline?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkCjkFriendly, remarkNewlineBreaks]}
      rehypePlugins={
        inline
          ? [rehypeRaw, rehypeSafeStyle, [rehypeSanitize, schema]]
          : [rehypeRaw, rehypeSafeStyle, [rehypeSanitize, schema], rehypeHighlight]
      }
      components={{
        // Legacy paragraphs and list items can contain markdown images without becoming IMAGE
        // blocks. Give them the same intrinsic-size reservation and lazy loading as PostImage.
        img: ({ src, alt = "", title, width, height }) => {
          const parsed = parseImageAlt(alt);
          const dims = parsed.dims && Number.isFinite(parsed.dims.w) && Number.isFinite(parsed.dims.h)
            && parsed.dims.w > 0 && parsed.dims.h > 0 ? parsed.dims : undefined;
          const w = dims?.w ?? width;
          const h = dims?.h ?? height;
          if (typeof src !== "string") {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={parsed.alt} title={title} loading="lazy" decoding="async" className="dark:brightness-90" width={w} height={h} />;
          }
          return (
            <VariantImage src={src} alt={parsed.alt} title={title} sizes={w && h ? POST_COLUMN_SIZES : undefined}
              loading="lazy" decoding="async" className="dark:brightness-90" width={w} height={h} />
          );
        },
        ...(inline
          ? { p: ({ children }: { children?: React.ReactNode }) => <>{children}</> }
          : {
              // Wrap tables so a too-wide one scrolls within the reading column instead of squishing
              // its cells unreadably on a phone (the .prose-post table CSS only sets w-full).
              table: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
                <div className="prose-table-wrap">
                  <table className={className}>{children}</table>
                </div>
              ),
            }),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
