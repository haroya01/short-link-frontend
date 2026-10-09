import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-key";
  return { steps: [] as string[], forget: vi.fn() };
});

vi.mock("@sentry/nextjs", () => ({ setUser: vi.fn(), setTag: vi.fn() }));
vi.mock("./api", () => ({
  claimAnonymousLinks: vi.fn(),
  logout: async () => {
    mocks.steps.push("logout");
  },
}));
vi.mock("./api/client", () => ({ bootstrapSession: vi.fn() }));
vi.mock("@/hooks/use-me", () => ({ useMe: vi.fn() }));
vi.mock("@/modules/notifications/api/notifications", () => ({
  subscribeWebPush: vi.fn(),
  unsubscribeWebPush: async (endpoint: string) => {
    mocks.steps.push(`forget ${endpoint}`);
    await mocks.forget();
  },
}));

import { endSession } from "./auth";

const ENDPOINT = "https://push.example/browser-1";

function holdSubscription(unsubscribe: () => Promise<boolean>) {
  const subscription = {
    endpoint: ENDPOINT,
    unsubscribe: async () => {
      mocks.steps.push("unsubscribe");
      return unsubscribe();
    },
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }) },
  });
}

beforeEach(() => {
  mocks.steps.length = 0;
  mocks.forget.mockReset();
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", class {});
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.unstubAllGlobals();
});

describe("endSession", () => {
  it("drops this browser's push subscription here and on the server before the session ends", async () => {
    holdSubscription(async () => true);
    await endSession();
    expect(mocks.steps).toEqual(["unsubscribe", `forget ${ENDPOINT}`, "logout"]);
  });

  it("still signs out when the server can't forget the subscription", async () => {
    holdSubscription(async () => true);
    mocks.forget.mockRejectedValue(new Error("offline"));
    await endSession();
    expect(mocks.steps).toEqual(["unsubscribe", `forget ${ENDPOINT}`, "logout"]);
  });

  it("still signs out when the browser can't drop the subscription", async () => {
    holdSubscription(() => Promise.reject(new Error("push service unavailable")));
    await endSession();
    expect(mocks.steps).toEqual(["unsubscribe", "logout"]);
  });

  it("signs straight out when this browser holds no push subscription", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: async () => undefined },
    });
    await endSession();
    expect(mocks.steps).toEqual(["logout"]);
  });
});
