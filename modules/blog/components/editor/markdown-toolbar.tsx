"use client";

import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import {
  insertCodeBlock,
  insertLink,
  prefixLines,
  wrapInline,
  type EditResult,
  type Selection,
} from "./markdown-commands";

type Producer = (value: string, sel: Selection) => EditResult;

type Props = {
  run: (producer: Producer) => void;
  onImage: () => void;
  uploading?: boolean;
};

const ICON = "h-4 w-4";

export function MarkdownToolbar({ run, onImage, uploading }: Props) {
  const btn =
    "grid h-8 w-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-2 py-1.5">
      <button type="button" className={btn} title="H1" onClick={() => run((v, s) => prefixLines(v, s, "# "))}>
        <Heading1 className={ICON} />
      </button>
      <button type="button" className={btn} title="H2" onClick={() => run((v, s) => prefixLines(v, s, "## "))}>
        <Heading2 className={ICON} />
      </button>
      <button type="button" className={btn} title="H3" onClick={() => run((v, s) => prefixLines(v, s, "### "))}>
        <Heading3 className={ICON} />
      </button>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <button type="button" className={btn} title="Bold" onClick={() => run((v, s) => wrapInline(v, s, "**"))}>
        <Bold className={ICON} />
      </button>
      <button type="button" className={btn} title="Italic" onClick={() => run((v, s) => wrapInline(v, s, "_"))}>
        <Italic className={ICON} />
      </button>
      <button type="button" className={btn} title="Code" onClick={() => run((v, s) => wrapInline(v, s, "`"))}>
        <Code className={ICON} />
      </button>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <button type="button" className={btn} title="Link" onClick={() => run(insertLink)}>
        <Link2 className={ICON} />
      </button>
      <button type="button" className={btn} title="Quote" onClick={() => run((v, s) => prefixLines(v, s, "> "))}>
        <Quote className={ICON} />
      </button>
      <button type="button" className={btn} title="List" onClick={() => run((v, s) => prefixLines(v, s, "- "))}>
        <List className={ICON} />
      </button>
      <button
        type="button"
        className={btn}
        title="Ordered list"
        onClick={() => run((v, s) => prefixLines(v, s, "1. "))}
      >
        <ListOrdered className={ICON} />
      </button>
      <button type="button" className={btn} title="Code block" onClick={() => run(insertCodeBlock)}>
        <Code className={ICON} />
      </button>
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <button type="button" className={btn} title="Image" onClick={onImage} disabled={uploading}>
        <ImageIcon className={ICON} />
      </button>
    </div>
  );
}
