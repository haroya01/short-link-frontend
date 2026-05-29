"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/**
 * Shared markdown renderer for the public reader. Post text blocks store raw markdown (the editor
 * authors markdown and the backend keeps it per-block), so inline formatting / code fences / GFM
 * tables only render correctly through this. Raw HTML is stripped by react-markdown's default —
 * a malicious paste can't inject scripts or iframes.
 *
 * `inline` unwraps the paragraph that react-markdown wraps single-line content in, for contexts
 * that already provide the block element (list items, blockquotes, headings).
 */
export function Markdown({ children, inline = false }: { children: string; inline?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={inline ? [] : [rehypeHighlight]}
      components={inline ? { p: ({ children }) => <>{children}</> } : undefined}
    >
      {children}
    </ReactMarkdown>
  );
}
