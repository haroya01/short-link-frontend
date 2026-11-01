import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmojiText } from "./emoji-text";

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

describe("EmojiText", () => {
  it("falls back to the name in colons when the picture does not load", async () => {
    const emojis = [{ shortcode: "neoghost", url: "https://media.example/neoghost.png" }];
    await act(async () => root.render(<EmojiText text="boo :neoghost:" emojis={emojis} />));
    const img = host.querySelector("img")!;
    expect(img.getAttribute("alt")).toBe(":neoghost:");
    await act(async () => {
      img.dispatchEvent(new Event("error"));
    });
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toBe("boo :neoghost:");
  });

  it("renders the text as is when the note lists no emojis", async () => {
    await act(async () => root.render(<EmojiText text="boo :neoghost:" />));
    expect(host.innerHTML).toBe("boo :neoghost:");
  });
});
