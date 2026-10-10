import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { ready: true, authenticated: true, me: { id: 1, username: "dohyun" } as { id: number; username: string } | null },
  confirm: vi.fn(),
  toast: vi.fn(),
  listBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  askToSignIn: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, values?: { username?: string }) =>
    values?.username ? `${namespace}.${key}:${values.username}` : `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [mocks.confirm, null] }));
vi.mock("@/lib/api/abuse-reports", () => ({ submitAbuseReport: vi.fn() }));
vi.mock("@/modules/notes/components/note-quote-dialog", () => ({
  NoteQuoteDialog: ({ quoted }: { quoted: unknown }) => (quoted ? createElement("div", { "data-testid": "quote-dialog" }) : null),
}));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: mocks.askToSignIn }));
vi.mock("@/modules/blog/api/follows", () => ({
  listBlockedUsers: mocks.listBlockedUsers,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.auth.authenticated = true;
  mocks.auth.me = { id: 1, username: "dohyun" };
  let server: string[] = [];
  mocks.listBlockedUsers.mockImplementation(async () => server.map((username, id) => ({ id, username, avatarUrl: null })));
  mocks.blockUser.mockImplementation(async (username: string) => { server = [username, ...server]; });
  mocks.unblockUser.mockImplementation(async (username: string) => { server = server.filter((u) => u !== username); });
  mocks.confirm.mockResolvedValue(true);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

async function render(element: () => Promise<React.ReactElement>) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const el = await element();
  await act(async () => root.render(el));
}
const menuButton = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
const items = () => Array.from(host.querySelectorAll('[role="menuitem"]')).map((b) => b.textContent);

describe("a comment's ⋯", () => {
  const comment = async (authorUsername: string | null, canReport: boolean) => {
    const { CommentMenu } = await import("./comment-menu");
    return createElement(CommentMenu, { commentId: 3, authorUsername, canReport });
  };

  it("blocks the writer after the shared confirmation, and reports the comment", async () => {
    await render(() => comment("kazuki", true));
    await act(async () => menuButton("notes.commentMenu")!.click());
    expect(items()).toEqual(["notes.blockMenu", "publicPost.report"]);
    await act(async () => (host.querySelector('[role="menuitem"]') as HTMLButtonElement).click());
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "notes.blockTitle:kazuki" }));
    expect(mocks.blockUser).toHaveBeenCalledWith("kazuki");

    await act(async () => menuButton("notes.commentMenu")!.click());
    await act(async () => (host.querySelectorAll('[role="menuitem"]')[1] as HTMLButtonElement).click());
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("publicPost.reportTitle");
  });

  it("offers only the report to a visitor, and nothing on my own comment", async () => {
    mocks.auth.authenticated = false;
    mocks.auth.me = null;
    await render(() => comment("kazuki", true));
    await act(async () => menuButton("notes.commentMenu")!.click());
    expect(items()).toEqual(["publicPost.report"]);
    await act(async () => root.unmount());

    mocks.auth.authenticated = true;
    mocks.auth.me = { id: 1, username: "dohyun" };
    await render(() => comment("dohyun", false));
    expect(menuButton("notes.commentMenu")).toBeNull();
  });
});

describe("a reader's ⋯ on a post", () => {
  const menu = async () => {
    const { PostReaderMenu } = await import("@/app/[locale]/p/[username]/_components/post-reader-menu");
    return createElement(PostReaderMenu, {
      postId: 16,
      authorUsername: "kazuki",
      postTitle: "제네릭",
      postSlug: "generics",
      postUrl: "https://kazuki.kurl.me/generics",
    });
  };
  const item = (label: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((b) => b.textContent === label)!;

  it("blocks the author and reports the post, with share and quote kept for phones", async () => {
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    expect(items()).toEqual(["share.label", "notes.quoteAction", "notes.blockMenu", "publicPost.report"]);
    expect(item("share.label").className).toContain("sm:hidden");
    expect(item("notes.quoteAction").className).toContain("sm:hidden");
    expect(item("notes.blockMenu").className).not.toContain("sm:hidden");
    await act(async () => item("notes.blockMenu").click());
    expect(mocks.blockUser).toHaveBeenCalledWith("kazuki");
    await act(async () => menuButton("notes.postMenu")!.click());
    expect(items()).toEqual(["share.label", "notes.quoteAction", "notes.unblock", "publicPost.report"]);
  });

  it("on my own post holds only share and quote, and only on phones", async () => {
    mocks.auth.me = { id: 4, username: "kazuki" };
    await render(menu);
    const trigger = menuButton("notes.postMenu")!;
    expect(trigger.parentElement!.className).toContain("sm:hidden");
    await act(async () => trigger.click());
    expect(items()).toEqual(["share.label", "notes.quoteAction"]);
  });

  it("shares through the system sheet, or copies the tagged link when there is none", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...navigator, share });
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("share.label").click());
    expect(share).toHaveBeenCalledWith({ title: "제네릭", url: "https://kazuki.kurl.me/generics" });

    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("share.label").click());
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("utm_campaign=generics"));
    expect(mocks.toast).toHaveBeenCalledWith("notes.linkCopied");
  });

  it("quotes the post in a note, or asks a visitor to sign in first", async () => {
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("notes.quoteAction").click());
    expect(host.querySelector("[data-testid=quote-dialog]")).not.toBeNull();
    await act(async () => root.unmount());

    mocks.auth.authenticated = false;
    mocks.auth.me = null;
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("notes.quoteAction").click());
    expect(mocks.askToSignIn).toHaveBeenCalledWith("quote");
  });
});
