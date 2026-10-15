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
  submitAbuseReport: vi.fn(),
  deletePost: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: { username?: string }) =>
    values?.username ? `${namespace}.${key}:${values.username}` : `${namespace}.${key}`,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [mocks.confirm, null] }));
vi.mock("@/lib/api/abuse-reports", () => ({ submitAbuseReport: mocks.submitAbuseReport }));
vi.mock("@/modules/notes/components/note-quote-dialog", () => ({
  NoteQuoteDialog: ({ quoted, onPosted }: { quoted: unknown; onPosted: (note: unknown) => void }) =>
    quoted
      ? createElement("button", { "data-testid": "quote-dialog", onClick: () => onPosted({ id: 9, authorUsername: "dohyun" }) })
      : null,
}));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: mocks.askToSignIn }));
vi.mock("@/modules/blog/api/posts", () => ({ deletePost: mocks.deletePost }));
vi.mock("@/modules/blog/lib/author-href", () => ({ authorHref: () => "#author-home" }));
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
    return createElement(CommentMenu, { subjectId: 3, authorUsername, canReport });
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

  it("reports a highlight reply as itself, not as a comment", async () => {
    mocks.submitAbuseReport.mockResolvedValue(undefined);
    await render(async () => {
      const { CommentMenu } = await import("./comment-menu");
      return createElement(CommentMenu, {
        subjectType: "HIGHLIGHT_REPLY",
        subjectId: 6001,
        authorUsername: "haruka",
        canReport: true,
      });
    });
    await act(async () => menuButton("notes.commentMenu")!.click());
    await act(async () => (host.querySelectorAll('[role="menuitem"]')[1] as HTMLButtonElement).click());
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector("h2")!.textContent).toBe("publicPost.reportTitleHighlightReply");
    await act(async () => dialog.querySelector<HTMLInputElement>('input[value="SPAM"]')!.click());
    await act(async () => dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
    expect(mocks.submitAbuseReport).toHaveBeenCalledWith(
      expect.objectContaining({ subjectType: "HIGHLIGHT_REPLY", subjectId: 6001, reasonCode: "SPAM" }),
    );
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
      locale: "ko",
    });
  };
  const item = (label: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((b) => b.textContent === label)!;

  it("blocks the author and reports the post, with share kept for widths where the dock takes the row", async () => {
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    expect(items()).toEqual(["share.label", "notes.quoteAction", "notes.blockMenu", "publicPost.report"]);
    expect(item("share.label").className).toContain("min-[1100px]:hidden");
    expect(item("notes.quoteAction").className).not.toContain("hidden");
    expect(item("notes.blockMenu").className).not.toContain("hidden");
    await act(async () => item("notes.blockMenu").click());
    expect(mocks.blockUser).toHaveBeenCalledWith("kazuki");
    await act(async () => menuButton("notes.postMenu")!.click());
    expect(items()).toEqual(["share.label", "notes.quoteAction", "notes.unblock", "publicPost.report"]);
  });

  it("on my own post leads with 수정 and 삭제, then share and quote, at every width", async () => {
    mocks.auth.me = { id: 4, username: "kazuki" };
    await render(menu);
    const trigger = menuButton("notes.postMenu")!;
    expect(trigger.parentElement!.className).not.toContain("hidden");
    await act(async () => trigger.click());
    expect(items()).toEqual(["publicPost.ownerEdit", "publicPost.ownerDelete", "share.label", "notes.quoteAction"]);
    expect(host.querySelector<HTMLAnchorElement>('a[role="menuitem"]')!.getAttribute("href")).toMatch(/\/write\/16$/);
    expect(host.querySelector("[data-owner-section]")!.textContent).toBe("publicPost.ownerEditpublicPost.ownerDelete");
  });

  it("deletes my post only after the confirm, then leaves for my home", async () => {
    mocks.auth.me = { id: 4, username: "kazuki" };
    mocks.confirm.mockResolvedValueOnce(false);
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("publicPost.ownerDelete").click());
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "publicPost.ownerDeleteConfirm", confirmLabel: "publicPost.ownerDelete", destructive: true }),
    );
    expect(mocks.deletePost).not.toHaveBeenCalled();

    mocks.deletePost.mockResolvedValueOnce(undefined);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("publicPost.ownerDelete").click());
    expect(mocks.deletePost).toHaveBeenCalledWith(16);
    expect(window.location.hash).toBe("#author-home");
  });

  it("says so when the delete fails, and stays on the post", async () => {
    mocks.auth.me = { id: 4, username: "kazuki" };
    mocks.deletePost.mockRejectedValueOnce(new Error("down"));
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("publicPost.ownerDelete").click());
    expect(mocks.toast).toHaveBeenCalledWith("publicPost.ownerDeleteError");
  });

  it("has no owner section on someone else's post", async () => {
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    expect(host.querySelector("[data-owner-section]")).toBeNull();
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

  it("quotes the post in a note with the view-note toast, or asks a visitor to sign in first", async () => {
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("notes.quoteAction").click());
    await act(async () => host.querySelector<HTMLButtonElement>("[data-testid=quote-dialog]")!.click());
    expect(mocks.toast).toHaveBeenCalledWith(
      "notes.quotePosted",
      "default",
      expect.objectContaining({ action: expect.objectContaining({ label: "notes.viewNote" }) }),
    );
    await act(async () => root.unmount());

    mocks.auth.authenticated = false;
    mocks.auth.me = null;
    await render(menu);
    await act(async () => menuButton("notes.postMenu")!.click());
    await act(async () => item("notes.quoteAction").click());
    expect(mocks.askToSignIn).toHaveBeenCalledWith("quote");
  });
});
