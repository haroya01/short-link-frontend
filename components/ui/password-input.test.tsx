import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { PasswordInput } from "./password-input";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(props: Partial<React.ComponentProps<typeof PasswordInput>> = {}) {
  await act(async () =>
    root.render(createElement(PasswordInput, { defaultValue: "open-sesame", "aria-label": "pw", ...props })),
  );
  return {
    input: container.querySelector("input") as HTMLInputElement,
    toggle: container.querySelector("button") as HTMLButtonElement,
  };
}

it("starts hidden and shows the password on demand, then hides it again", async () => {
  const { input, toggle } = await render();
  expect(input.type).toBe("password");
  expect(toggle.getAttribute("aria-label")).toBe("showPassword");

  await act(async () => toggle.click());
  expect(input.type).toBe("text");
  expect(input.value).toBe("open-sesame");
  expect(toggle.getAttribute("aria-pressed")).toBe("true");
  expect(toggle.getAttribute("aria-label")).toBe("hidePassword");

  await act(async () => toggle.click());
  expect(input.type).toBe("password");
});

it("keeps the caret in the field when the eye is pressed", async () => {
  const { input, toggle } = await render();
  input.focus();
  const press = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  toggle.dispatchEvent(press);
  expect(press.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(input);
});

it("never autocorrects or capitalizes what is typed", async () => {
  const { input } = await render();
  expect(input.getAttribute("autocapitalize")).toBe("none");
  expect(input.getAttribute("autocorrect")).toBe("off");
  expect(input.getAttribute("spellcheck")).toBe("false");
});

it("cannot be revealed while the field is disabled", async () => {
  const { toggle } = await render({ disabled: true });
  expect(toggle.disabled).toBe(true);
});
