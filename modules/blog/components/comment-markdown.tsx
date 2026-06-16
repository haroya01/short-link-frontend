import type { ReactNode } from "react";
import { authorHref } from "@/modules/blog/components/feed-card";

// Matches @username (the backend's handle grammar); the lookbehind keeps it out of emails (foo@bar).
const MENTION_RE = /(?<![A-Za-z0-9_])@([a-z0-9][a-z0-9_]{2,15})/g;

/** @멘션만 링크로 — 인라인 마크다운 파서가 plain 세그먼트에 대해 호출한다. */
function linkifyMentions(text: string, locale: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const handle = m[1];
    nodes.push(
      <a
        key={`${keyBase}-${m.index}`}
        href={authorHref(handle, locale)}
        className="font-medium text-accent-700 transition-colors hover:underline dark:text-accent-400"
      >
        @{handle}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// 인라인 마크다운: `code` → [라벨](http URL) → **굵게** → *기울임* 순서로 한 토큰씩 소비하고,
// 남는 plain 텍스트는 멘션 링크화. React 노드를 직접 조립하므로(raw HTML 없음) XSS 표면이 없다.
const INLINE_RE = /(`[^`\n]+`)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/;

function renderInline(text: string, locale: string, keyBase = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest.length > 0) {
    const m = rest.match(INLINE_RE);
    if (!m || m.index == null) {
      out.push(...linkifyMentions(rest, locale, `${keyBase}-${k}`));
      break;
    }
    if (m.index > 0) out.push(...linkifyMentions(rest.slice(0, m.index), locale, `${keyBase}-${k}`));
    const tok = m[0];
    const key = `${keyBase}-${k++}`;
    if (tok.startsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12.5px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[")) {
      const lm = tok.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (lm) {
        out.push(
          <a key={key} href={lm[2]} target="_blank" rel="noreferrer noopener" className="text-accent-700 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-600 dark:text-accent-400">
            {lm[1]}
          </a>,
        );
      } else {
        out.push(tok);
      }
    } else if (tok.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold">
          {renderInline(tok.slice(2, -2), locale, key)}
        </strong>,
      );
    } else {
      out.push(<em key={key}>{renderInline(tok.slice(1, -1), locale, key)}</em>);
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

/** 댓글 본문 — 마크다운 서브셋(코드블록·인용·리스트·인라인 서식) + @멘션 링크.
 *  본문(.prose-post)과 같은 문법이되 댓글 크기로: 개발 블로그 독자에겐 댓글 코드블록이 필수다.
 *  헤딩 문법은 의도적으로 무시(댓글이 글의 위계와 경쟁하지 않게 — plain 문단으로 떨어진다).
 *  작성 입력기의 라이브 미리보기와 목록(내 댓글 모아보기)이 같은 렌더러를 공유한다. */
export function CommentBody({ text, locale }: { text: string; locale: string }) {
  const out: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++; // 닫는 펜스
      out.push(
        <pre key={k++} className="my-1.5 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-slate-100">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) quote.push(lines[i++].slice(2));
      out.push(
        <blockquote key={k++} className="my-1.5 border-l-2 border-accent-200 pl-3 text-slate-500 dark:border-accent-500/40 dark:text-slate-400">
          {renderInline(quote.join(" "), locale, `q${k}`)}
        </blockquote>,
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) items.push(lines[i++].slice(2));
      out.push(
        <ul key={k++} className="my-1.5 list-disc space-y-0.5 pl-5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, locale, `l${k}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // 일반 문단 — 연속 줄을 한 문단으로(단일 개행은 공백)
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(```|> |[-*] )/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={k++}>{renderInline(para.join(" "), locale, `p${k}`)}</p>);
  }
  return <div className="space-y-1.5">{out}</div>;
}
