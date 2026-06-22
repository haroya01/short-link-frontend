"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Bold, Code2, Italic, Link as LinkIcon, List, Quote, type LucideIcon } from "lucide-react";
import { UrlDialog } from "@/modules/blog/components/editor/url-dialog";

/** tiptap-markdown augments storage at runtime but ships no type for it. */
function getMarkdown(editor: Editor): string {
  return (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() ?? "";
}

/** A link target needs an http(s) scheme to round-trip through the comment renderer (CommentBody only
 *  linkifies `[text](https?://…)`). Bare domains get https:// so the link survives. */
function withScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Hard cap (parity with the old textarea maxLength=2000) — reject any edit that would push the
 *  plain-text length over the limit. Deletions always shrink, so they pass. */
const CommentMaxLength = Extension.create({
  name: "commentMaxLength",
  addProseMirrorPlugins() {
    return [new Plugin({ filterTransaction: (tr) => !tr.docChanged || tr.doc.textContent.length <= 2000 })];
  },
});

/**
 * 댓글/답글 입력기 — WYSIWYG. 입력칸 자체가 결과를 보여준다(굵게는 굵게, 인용은 인용 모양으로) —
 * 마크다운 기호도, 별도 미리보기 칸도 없다. 본문 에디터(Tiptap)와 같은 엔진이되 댓글 문법 서브셋만
 * 켠다(헤딩·표·이미지 ❌). 저장은 그대로 마크다운으로 직렬화돼(tiptap-markdown) 발행 후 CommentBody
 * 렌더와 1:1. 값(markdown 문자열) in/out 계약은 그대로라 부모(댓글·답글·하이라이트 답글)는 안 바뀐다.
 */
export function CommentComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  submitting = false,
  canSubmit,
  rows = 3,
  autoFocus = false,
  compact = false,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
  submitting?: boolean;
  /** Whether the submit button is enabled (login-gated surfaces keep it tappable to start auth). */
  canSubmit: boolean;
  rows?: number;
  autoFocus?: boolean;
  /** Reply variant — tighter toolbar. */
  compact?: boolean;
  /** Left-aligned slot on the action row (e.g. a login hint). */
  footer?: ReactNode;
}) {
  const t = useTranslations("comments");
  const [linkOpen, setLinkOpen] = useState(false);
  // Keep the latest callbacks reachable from the editor's (mount-time) closures without re-creating it.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  // Mirror the value we last emitted so the controlled-reset effect can tell an external clear (after
  // submit) apart from our own keystroke echo, and skip re-seeding the doc on every render.
  const lastEmitted = useRef(value);

  const editor = useEditor({
    // Next SSR: Tiptap must not render on the server (hydration mismatch otherwise).
    immediatelyRender: false,
    extensions: [
      // 댓글 문법 서브셋만: 굵게·기울임·인라인 코드·링크·불릿·인용·코드블록. 헤딩/순서목록/취소선/
      // 구분선은 댓글 렌더러(CommentBody)에 없어 끈다 — 켜 두면 직렬화돼 발행 후 깨진다.
      StarterKit.configure({
        heading: false,
        orderedList: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false },
      }),
      CommentMaxLength,
      // html:false — 표준 마크다운만. breaks:true 로 single newline 을 줄바꿈으로(본문과 동일).
      Markdown.configure({ html: false, breaks: true, transformPastedText: true }),
    ],
    content: value || "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: { class: "tiptap-comment focus:outline-none" },
      // Cmd/Ctrl+Enter 제출(버튼은 그대로) — 길게 쓰다 손 떼지 않고 보낼 수 있게.
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          onSubmitRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const md = getMarkdown(editor);
      lastEmitted.current = md;
      onChangeRef.current(md);
    },
  });

  // Controlled-reset sync: when the parent clears `value` (after a successful submit) or sets it from
  // outside, re-seed the doc. We compare against the LAST value we emitted so our own keystroke echo
  // (parent state === editor markdown) never triggers a re-seed mid-typing.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  function applyLink(rawUrl: string) {
    if (!editor) return;
    const href = withScheme(rawUrl);
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const { empty, from } = editor.state.selection;
    if (empty) {
      // No selection — drop the URL in as its own linked text.
      editor.chain().focus().insertContent(href).setTextSelection({ from, to: from + href.length }).setLink({ href }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  }

  const minHeight = `${(compact ? rows : Math.max(rows, 3)) * 1.6 + 1}rem`;

  if (!editor) {
    return (
      <div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700" style={{ minHeight }} />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 transition-colors focus-within:border-accent-400 dark:border-slate-700 dark:focus-within:border-accent-500">
        <CommentToolbar
          editor={editor}
          compact={compact}
          onLink={() => setLinkOpen(true)}
        />
        <CommentEditable editor={editor} placeholder={placeholder} minHeight={minHeight} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-slate-500 dark:text-slate-400">{footer}</span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className={`shrink-0 rounded-lg bg-accent-700 font-medium text-white transition-colors hover:bg-accent-800 focus-ring disabled:opacity-50 ${
            compact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"
          }`}
        >
          {submitLabel}
        </button>
      </div>

      <UrlDialog
        open={linkOpen}
        title={t("link")}
        placeholder="https://example.com"
        initialValue={(editor.getAttributes("link").href as string | undefined) ?? ""}
        allowRemove={editor.isActive("link")}
        onClose={() => setLinkOpen(false)}
        onSubmit={(url) => applyLink(url)}
        onRemove={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
      />
    </div>
  );
}

/**
 * 입력 가능한 본문 — ProseMirror 출력을 댓글 렌더(CommentBody)와 같은 결로 스타일링한다(굵게·인라인
 * 코드·인용·불릿·코드블록·링크). 비어 있을 때만 placeholder 를 얹는다(별도 확장 없이).
 */
function CommentEditable({
  editor,
  placeholder,
  minHeight,
}: {
  editor: Editor;
  placeholder: string;
  minHeight: string;
}) {
  // Tiptap v3 useEditor doesn't re-render on transactions → subscribe so the placeholder hides the
  // instant the first character lands.
  const isEmpty = useEditorState({ editor, selector: ({ editor }) => editor.isEmpty });

  return (
    <div className="relative">
      {isEmpty && (
        <span className="pointer-events-none absolute left-4 top-3 text-[15px] text-slate-400 dark:text-slate-500">
          {placeholder}
        </span>
      )}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={
          "px-4 py-3 text-[15px] leading-relaxed dark:text-slate-100 " +
          "[&_.tiptap-comment]:min-h-[inherit] [&_.tiptap-comment]:outline-none " +
          "[&_strong]:font-semibold [&_em]:italic " +
          "[&_a]:text-accent-700 [&_a]:underline [&_a]:decoration-accent-300 [&_a]:underline-offset-2 dark:[&_a]:text-accent-400 " +
          "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-slate-800 dark:[&_code]:bg-slate-800 dark:[&_code]:text-slate-200 " +
          "[&_blockquote]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-accent-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 dark:[&_blockquote]:border-accent-500/40 dark:[&_blockquote]:text-slate-400 " +
          "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 " +
          "[&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:px-3 [&_pre]:py-2.5 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:leading-relaxed [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100"
        }
      />
    </div>
  );
}

/**
 * 서식 툴바 — 굵게·기울임·코드·링크·불릿·인용. 본문 에디터처럼 onMouseDown+preventDefault 로 선택을
 * 지키고(클릭이 blur 로 선택을 무너뜨리면 마크 토글·링크가 no-op), useEditorState 로 active 를 즉시 반영.
 */
function CommentToolbar({
  editor,
  compact,
  onLink,
}: {
  editor: Editor;
  compact: boolean;
  onLink: () => void;
}) {
  const t = useTranslations("comments");
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
      bullet: editor.isActive("bulletList"),
      quote: editor.isActive("blockquote"),
    }),
  });

  const tools: { icon: LucideIcon; label: string; active: boolean; run: () => void }[] = [
    { icon: Bold, label: t("bold"), active: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: t("italic"), active: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Code2, label: t("code"), active: active.code, run: () => editor.chain().focus().toggleCode().run() },
    { icon: LinkIcon, label: t("link"), active: active.link, run: onLink },
    { icon: List, label: t("list"), active: active.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: Quote, label: t("quote"), active: active.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-slate-100 px-1.5 py-1 dark:border-slate-800">
      {tools.map((it, i) => (
        <button
          key={i}
          type="button"
          aria-label={it.label}
          aria-pressed={it.active}
          title={it.label}
          // onMouseDown+preventDefault keeps the editor selection alive through the click so the toggle
          // wraps what was selected (a plain onClick would blur and collapse it first).
          onMouseDown={(ev) => {
            ev.preventDefault();
            it.run();
          }}
          className={`touch-target focus-ring grid h-8 w-8 place-items-center rounded-md transition-colors ${
            it.active
              ? "bg-accent-50 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          }`}
        >
          <it.icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      ))}
    </div>
  );
}
