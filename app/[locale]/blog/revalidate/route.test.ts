import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchWithTimeout: vi.fn(), revalidateTag: vi.fn() }));

vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/api/fetch-timeout", () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));

function request(body: unknown, authorization: string | null = "Bearer t") {
  return new Request("http://localhost/ko/blog/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(body),
  });
}

function backend(me: { status: number; username?: string }, post: { status: number }) {
  mocks.fetchWithTimeout.mockImplementation(async (url: string) =>
    url.endsWith("/api/v1/users/me")
      ? new Response(JSON.stringify({ username: me.username ?? null }), { status: me.status })
      : new Response("{}", { status: post.status }),
  );
}

async function route() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshing cached lists after a post's audience or countries change", () => {
  it("refuses a caller without a token", async () => {
    const { POST } = await route();
    expect((await POST(request({ postId: 7 }, null))).status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("refuses a malformed post id", async () => {
    const { POST } = await route();
    expect((await POST(request({ postId: "7" }))).status).toBe(400);
    expect((await POST(request({ postId: -1 }))).status).toBe(400);
  });

  it("refuses a post the caller doesn't own", async () => {
    backend({ status: 200, username: "hana" }, { status: 404 });
    const { POST } = await route();
    expect((await POST(request({ postId: 7 }))).status).toBe(403);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("refreshes only the caller's own list and the public lists, checking with the caller's token", async () => {
    backend({ status: 200, username: "Hana" }, { status: 200 });
    const { POST } = await route();
    expect((await POST(request({ postId: 7 }))).status).toBe(204);
    expect(mocks.revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["author-posts:hana", "public-posts"]);
    for (const [, init] of mocks.fetchWithTimeout.mock.calls as [string, RequestInit][]) {
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer t");
    }
    expect(mocks.fetchWithTimeout).toHaveBeenCalledWith(expect.stringContaining("/api/v1/posts/7"), expect.anything());
  });

  it("stops after a handful of refreshes a minute per writer", async () => {
    backend({ status: 200, username: "busy" }, { status: 200 });
    const { POST } = await route();
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) statuses.push((await POST(request({ postId: 7 }))).status);
    expect(statuses.filter((s) => s === 204)).toHaveLength(6);
    expect(statuses.slice(6)).toEqual([429, 429]);
  });
});

describe("the backend clearing every public page after a post changes", () => {
  function signal(secret: string | null) {
    return new Request("http://localhost/ko/blog/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret !== null ? { "X-Revalidate-Secret": secret } : {}) },
      body: "{}",
    });
  }

  it("clears the shared public tag when the secret matches, without asking the backend anything", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    const { POST } = await route();
    expect((await POST(signal("s3cret"))).status).toBe(204);
    expect(mocks.revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["public-posts"]);
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("refuses a wrong secret, and any secret while none is configured", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    let { POST } = await route();
    expect((await POST(signal("nope"))).status).toBe(401);
    vi.stubEnv("REVALIDATE_SECRET", "");
    ({ POST } = await route());
    expect((await POST(signal(""))).status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("caps a burst of signals", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    const { POST } = await route();
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await POST(signal("s3cret"))).status);
    expect(statuses.filter((s) => s === 204)).toHaveLength(6);
    expect(statuses.slice(6)).toEqual([429, 429]);
    vi.unstubAllEnvs();
  });
});
