import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listApiKeys: vi.fn(),
  issueApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  startTwoFactorSetup: vi.fn(),
  confirmTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));
vi.mock("@/lib/api", () => api);
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/error-messages", () => ({ useApiErrorMessage: () => (_err: unknown, fallback: string) => fallback }));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [vi.fn(), null] }));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async () => "data:image/png;base64,AAAA") } }));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.unoptimized;
    return React.createElement("img", rest);
  },
}));

import { ApiKeysSection } from "./api-keys-section";
import { TwoFactorSection } from "./two-factor-section";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function elementWithText(text: string): HTMLElement {
  const match = Array.from(host.querySelectorAll<HTMLElement>("*")).find(
    (el) => el.children.length === 0 && el.textContent === text,
  );
  if (!match) throw new Error(`no element with text ${text}`);
  return match;
}

function button(label: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === label);
  if (!match) throw new Error(`no button ${label}`);
  return match;
}

function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("secrets stay out of session replays", () => {
  it("masks a freshly issued API key", async () => {
    api.listApiKeys.mockResolvedValue([]);
    api.issueApiKey.mockResolvedValue({ id: 1, name: "ci", prefix: "kurl_ab", rawKey: "kurl_abcdef123456" });
    await act(async () => root.render(<ApiKeysSection />));
    await act(async () => host.querySelector("form")!.requestSubmit());
    expect(elementWithText("kurl_abcdef123456").closest("[data-sentry-mask]")).not.toBeNull();
  });

  it("masks the TOTP secret, blocks its QR code, and masks recovery codes", async () => {
    api.getTwoFactorStatus.mockResolvedValue({ enabled: false });
    api.startTwoFactorSetup.mockResolvedValue({ secret: "JBSWY3DPEHPK3PXP", provisioningUri: "otpauth://totp/kurl" });
    api.confirmTwoFactor.mockResolvedValue({ recoveryCodes: ["aaaa-1111", "bbbb-2222"] });
    await act(async () => root.render(<TwoFactorSection />));
    await act(async () => button("enableButton").click());

    expect(elementWithText("JBSWY3DPEHPK3PXP").closest("[data-sentry-mask]")).not.toBeNull();
    expect(host.querySelector('img[alt="2FA QR"]')?.hasAttribute("data-sentry-block")).toBe(true);

    await act(async () => type(host.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!, "123456"));
    await act(async () => button("confirmButton").click());
    for (const code of ["aaaa-1111", "bbbb-2222"]) {
      expect(elementWithText(code).closest("[data-sentry-mask]")).not.toBeNull();
    }
  });
});
