import React, { act } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { Bell } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlogEmpty } from "./blog-empty";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("BlogEmpty", () => {
  it("is an icon, one line and one action", async () => {
    await act(async () =>
      root.render(<BlogEmpty icon={Bell} title="아직 알림이 없어요" action={<a href="/">피드 둘러보기</a>} />),
    );
    const empty = host.querySelector('[data-testid="blog-empty"]')!;
    expect(empty.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(empty.querySelector("h2")!.textContent).toBe("아직 알림이 없어요");
    expect(empty.querySelectorAll("p")).toHaveLength(0);
    expect(empty.querySelectorAll("a")).toHaveLength(1);
  });

  it("adds the second line only when given one", async () => {
    await act(async () => root.render(<BlogEmpty icon={Bell} title="아직 알림이 없어요" body="소식이 여기 모여요." />));
    expect(host.querySelector('[data-testid="blog-empty"] p')!.textContent).toBe("소식이 여기 모여요.");
  });
});

const ROOTS = ["app/[locale]/blog", "app/[locale]/p", "modules/blog", "modules/notes", "modules/notifications"];
const FIRST_RUN = new Set([
  "modules/blog/components/feed-screen.tsx",
  "modules/blog/components/following-feed.tsx",
  "modules/blog/components/for-you-feed.tsx",
  "modules/blog/components/subscribed-series-feed.tsx",
  "modules/notes/components/notes-feed.tsx",
  "modules/notes/components/note-lists.tsx",
  "app/[locale]/blog/notifications/page.tsx",
]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("one empty-state grammar across blog and notes", () => {
  const files = ROOTS.flatMap((dir) => sources(join(process.cwd(), dir))).map((path) => ({
    path: relative(process.cwd(), path),
    text: readFileSync(path, "utf8"),
  }));

  it("never reaches for the dashed-card EmptyState", () => {
    expect(files.filter((f) => f.text.includes("@/components/common/empty-state")).map((f) => f.path)).toEqual([]);
  });

  it("gives a second line only on first-run surfaces", () => {
    const withBody = files
      .filter((f) => /<BlogEmpty\b[^>]*?\sbody=/s.test(f.text) || /icon: \w+, title: [^}]*body:/.test(f.text))
      .map((f) => f.path);
    expect(withBody.length).toBeGreaterThan(0);
    expect(withBody.filter((path) => !FIRST_RUN.has(path))).toEqual([]);
  });
});
