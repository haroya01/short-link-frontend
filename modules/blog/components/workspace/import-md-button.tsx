"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createPost, replaceBlocks, updatePostMetadata } from "@/modules/blog/api/posts";
import { markdownToBlocks } from "@/modules/blog/lib/markdown-to-blocks";

function randomSlug(): string {
  return "draft-" + Math.random().toString(36).slice(2, 9);
}

/**
 * 한 .md 파일 → 초안 한 편. 다른 플랫폼(velog 등)에서 받은 마크다운을 그대로 끌어오는 이주 통로 —
 * 글이 자산인 플랫폼에서 "들어오는 문"이 없으면 작가가 옮겨올 이유가 없다.
 *
 * 제목 결정 우선순위: frontmatter title → 본문 첫 `# 헤딩`(본문에서 제거 — 발행면 <h1>은 제목이
 * 차지하므로 중복) → 파일명. frontmatter 의 tags 도 가져온다(그 외 키는 무시 — 보수적으로).
 */
function parseImport(filename: string, raw: string): { title: string; tags: string[]; body: string } {
  let body = raw.replace(/^﻿/, "");
  let title = "";
  let tags: string[] = [];

  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = body.slice(fm[0].length);
    const titleLine = fm[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleLine) title = titleLine[1].trim();
    // tags: [a, b] 와 "tags:\n  - a" 두 표기 모두 수용
    const inline = fm[1].match(/^tags:\s*\[([^\]]*)\]\s*$/m);
    if (inline) {
      tags = inline[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      const block = fm[1].match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
      if (block) tags = block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean);
    }
  }

  if (!title) {
    const h1 = body.match(/^#\s+(.+?)\s*$/m);
    if (h1) {
      title = h1[1].trim();
      body = body.replace(h1[0], "").replace(/^\n+/, "");
    }
  }
  if (!title) title = filename.replace(/\.(md|markdown)$/i, "");

  return { title: title.slice(0, 200), tags: tags.slice(0, 10), body: body.trim() };
}

export function ImportMdButton({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("postEditor");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState(false);

  async function importFiles(files: FileList) {
    const list = [...files];
    setError(false);
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    // 순차 처리 — 병렬로 쏘면 슬러그 충돌/레이트 리밋 위험만 생기고, 파일 수가 많아야 수십 개다.
    for (let i = 0; i < list.length; i++) {
      try {
        const raw = await list[i].text();
        const { title, tags, body } = parseImport(list[i].name, raw);
        const post = await createPost({ slug: randomSlug(), title });
        await replaceBlocks(post.id, markdownToBlocks(body));
        if (tags.length > 0) await updatePostMetadata(post.id, { title, tags });
      } catch (e) {
        console.error("[import-md]", e);
        failed += 1;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (failed > 0) setError(true);
    onDone?.();
    router.refresh();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress != null}
        className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 sm:px-3.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
      >
        {progress ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("importProgress", { done: progress.done, total: progress.total })}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {t("importMd")}
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-[12px] text-red-600 dark:text-red-400">
          {t("importPartialError")}
        </p>
      )}
    </>
  );
}
