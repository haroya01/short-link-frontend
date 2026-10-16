import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostStatus } from "@/modules/blog/api/posts";
import type { PasswordProblem, PostAudience } from "@/modules/blog/lib/post-audience";

const mocks = vi.hoisted(() => ({ confirm: vi.fn() }));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (ns?: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${values ? `(${Object.values(values).join(",")})` : ""}`,
}));
vi.mock("@/components/links/country-combobox", () => ({
  CountryCombobox: ({ onChange, disabled }: { onChange: (c: string) => void; disabled?: boolean }) =>
    createElement("button", { type: "button", "data-testid": "country-pick", disabled, onClick: () => onChange("cn") }, "pick"),
}));
vi.mock("@/components/ui/use-confirm", () => ({ useConfirm: () => [mocks.confirm, null] }));

import { AudienceSection } from "./audience-section";

type Props = Parameters<typeof AudienceSection>[0];

let root: Root;
let host: HTMLDivElement;
let props: Props;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  props = {
    status: "DRAFT" as PostStatus,
    audience: "PUBLIC" as PostAudience,
    onAudienceChange: vi.fn(),
    password: "",
    onPasswordChange: vi.fn(),
    hasPassword: false,
    passwordIssue: null as PasswordProblem | null,
    showPasswordIssue: false,
    unlistedUrl: null,
    onRotate: vi.fn().mockResolvedValue(true),
    blockedCountries: [],
    onBlockedCountriesChange: vi.fn(),
  };
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = undefined as unknown as HTMLDivElement;
  root = undefined as unknown as Root;
  vi.unstubAllGlobals();
});

async function render(over: Partial<Props> = {}) {
  props = { ...props, ...over };
  if (!host) {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  }
  await act(async () => root.render(createElement(AudienceSection, props)));
}

const radios = () => [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
const text = () => host.textContent ?? "";

describe("the audience picker in publish settings", () => {
  it("offers the four audiences as words only, one of them checked", async () => {
    await render({ audience: "FOLLOWERS" });
    expect(radios().map((r) => r.textContent)).toEqual([
      "publicPost.audience.PUBLIC",
      "publicPost.audience.UNLISTED",
      "publicPost.audience.FOLLOWERS",
      "publicPost.audience.PASSWORD",
    ]);
    expect(radios().some((r) => r.querySelector("svg"))).toBe(false);
    expect(radios().map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "false", "true", "false"]);
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
  });

  it("changes on click and moves with the arrow keys", async () => {
    await render();
    await act(async () => radios()[3].click());
    expect(props.onAudienceChange).toHaveBeenLastCalledWith("PASSWORD");
    await act(async () => {
      radios()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(props.onAudienceChange).toHaveBeenLastCalledWith("PASSWORD");
    await act(async () => {
      radios()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(props.onAudienceChange).toHaveBeenLastCalledWith("UNLISTED");
  });

  it("says nothing extra for 전체", async () => {
    await render();
    expect(text()).not.toContain("postEditor.audience.titlePublic");
    expect(host.querySelector('input[type="password"]')).toBeNull();
  });

  it("tells a followers-only writer the title stays public", async () => {
    await render({ audience: "FOLLOWERS" });
    expect(text()).toContain("postEditor.audience.titlePublic");
  });

  it("asks for a password, and names a new one when a password is already set", async () => {
    await render({ audience: "PASSWORD" });
    const input = host.querySelector<HTMLInputElement>('input[type="password"]')!;
    expect(input.placeholder).toBe("postEditor.audience.passwordPlaceholder");
    expect(text()).toContain("postEditor.audience.titlePublic");
    await render({ audience: "PASSWORD", hasPassword: true });
    expect(host.querySelector<HTMLInputElement>('input[type="password"]')!.placeholder).toBe(
      "postEditor.audience.newPasswordPlaceholder",
    );
  });

  it("shows why publishing is held only once the writer tried", async () => {
    await render({ audience: "PASSWORD", passwordIssue: "required" });
    expect(host.querySelector('[role="alert"]')).toBeNull();
    await render({ audience: "PASSWORD", passwordIssue: "required", showPasswordIssue: true });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("postEditor.audience.passwordRequired");
    await render({ audience: "PASSWORD", passwordIssue: "required", showPasswordIssue: true, status: "PUBLISHED" });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("postEditor.audience.passwordRequiredSave");
    await render({ audience: "PASSWORD", passwordIssue: "length", showPasswordIssue: true });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("postEditor.audience.passwordLength");
  });

  it("explains a link-only post before publishing and shows its link only once it's out", async () => {
    await render({ audience: "UNLISTED", unlistedUrl: "https://blog.kurl.me/@me/x?k=1" });
    expect(text()).toContain("postEditor.audience.unlistedHint");
    expect(host.querySelector('[data-testid="unlisted-link"]')).toBeNull();
    await render({ audience: "UNLISTED", status: "PUBLISHED", unlistedUrl: "https://blog.kurl.me/@me/x?k=1" });
    expect(host.querySelector<HTMLInputElement>('[data-testid="unlisted-link"] input')!.value).toBe(
      "https://blog.kurl.me/@me/x?k=1",
    );
  });

  it("changes the link only after the writer confirms", async () => {
    await render({ audience: "UNLISTED", status: "PUBLISHED", unlistedUrl: "https://blog.kurl.me/@me/x?k=1" });
    const rotate = [...host.querySelectorAll<HTMLButtonElement>('[data-testid="unlisted-link"] button')].find(
      (b) => b.textContent === "postEditor.audience.rotate",
    )!;
    mocks.confirm.mockResolvedValueOnce(false);
    await act(async () => rotate.click());
    expect(props.onRotate).not.toHaveBeenCalled();
    mocks.confirm.mockResolvedValueOnce(true);
    await act(async () => rotate.click());
    expect(props.onRotate).toHaveBeenCalledTimes(1);
  });

  it("adds countries in upper case once each, removes them, and explains the limit only when one is set", async () => {
    await render();
    expect(text()).not.toContain("postEditor.audience.countryHint");
    await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="country-pick"]')!.click());
    expect(props.onBlockedCountriesChange).toHaveBeenLastCalledWith(["CN"]);
    await render({ blockedCountries: ["CN"] });
    expect(text()).toContain("postEditor.audience.countryHint");
    vi.mocked(props.onBlockedCountriesChange).mockClear();
    await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="country-pick"]')!.click());
    expect(props.onBlockedCountriesChange).not.toHaveBeenCalled();
    const remove = host.querySelector<HTMLButtonElement>('button[aria-label^="postEditor.audience.countryRemove"]')!;
    await act(async () => remove.click());
    expect(props.onBlockedCountriesChange).toHaveBeenLastCalledWith([]);
  });
});
