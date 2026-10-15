import React, { act, forwardRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));
vi.mock("@/modules/mentions/mention-textarea", () => ({
  MentionTextarea: forwardRef<
    HTMLTextAreaElement,
    { value: string; onValueChange: (v: string) => void } & React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >(function MentionTextarea({ value, onValueChange, ...rest }, ref) {
    return <textarea ref={ref} value={value} onChange={(e) => onValueChange(e.target.value)} {...rest} />;
  }),
}));

import { ConversationComposer } from "./conversation-composer";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", (media: string) => ({ matches: false, media, addEventListener() {}, removeEventListener() {} }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(props: Partial<React.ComponentProps<typeof ConversationComposer>> = {}) {
  const onSubmit = vi.fn();
  await act(async () =>
    root.render(
      <ConversationComposer
        value=""
        onChange={() => {}}
        onSubmit={onSubmit}
        label="댓글 쓰기"
        placeholder="댓글 쓰기"
        submitLabel="댓글 작성"
        {...props}
      />,
    ),
  );
  return {
    onSubmit,
    field: container.querySelector("textarea")!,
    submit: container.querySelector<HTMLButtonElement>("button[type='submit']")!,
    counter: () => container.querySelector("[data-testid='composer-counter']"),
  };
}

it("is a plain text field with a name, no formatting toolbar", async () => {
  const { field } = await render();
  expect(field.getAttribute("aria-label")).toBe("댓글 쓰기");
  expect(container.querySelector("[contenteditable]")).toBeNull();
  expect(container.querySelectorAll("button").length).toBe(1);
});

it("counts down only near the limit and refuses to send past it", async () => {
  let ui = await render({ value: "가".repeat(1700) });
  expect(ui.counter()).toBeNull();
  expect(ui.submit.disabled).toBe(false);

  ui = await render({ value: "가".repeat(1850) });
  expect(ui.counter()?.textContent).toBe("charsLeft:150");

  ui = await render({ value: "가".repeat(2001) });
  expect(ui.counter()?.textContent).toBe("charsLeft:-1");
  expect(ui.submit.disabled).toBe(true);
  await act(async () => ui.field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true })));
  expect(ui.onSubmit).not.toHaveBeenCalled();
});

it("sends with Ctrl/Cmd+Enter, and only with words in it", async () => {
  let ui = await render({ value: "   " });
  await act(async () => ui.field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true })));
  expect(ui.onSubmit).not.toHaveBeenCalled();

  ui = await render({ value: "좋은 글" });
  await act(async () => ui.field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true })));
  expect(ui.onSubmit).toHaveBeenCalledTimes(1);
});

it("names who the reply goes to, and can step back from it", async () => {
  const onCancelReply = vi.fn();
  await render({ replyingTo: "minji", onCancelReply });
  expect(container.querySelector("[data-testid='composer-replying-to']")?.textContent).toBe("replyingTo:minji");
  const cancel = container.querySelector<HTMLButtonElement>("button[aria-label='cancelReply']")!;
  await act(async () => cancel.click());
  expect(onCancelReply).toHaveBeenCalledTimes(1);
});
