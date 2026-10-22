import { afterEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  replay: vi.fn(() => ({ name: "Replay" })),
  addIntegration: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  init: sentry.init,
  lazyLoadIntegration: vi.fn(async () => sentry.replay),
  getClient: () => ({ addIntegration: sentry.addIntegration }),
  captureRouterTransitionStart: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("client Sentry replay", () => {
  it("masks all text, inputs and media in recorded sessions", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/123");
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => cb());
    await import("./instrumentation-client");
    await vi.waitFor(() => expect(sentry.addIntegration).toHaveBeenCalled());
    expect(sentry.replay).toHaveBeenCalledWith(
      expect.objectContaining({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
    );
  });
});
