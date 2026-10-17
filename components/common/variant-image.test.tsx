import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VariantImage } from "./variant-image";

const CDN = "https://d82putaebkgm4.cloudfront.net";

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

async function render(...images: { src: string; sizes?: string; width?: number }[]) {
  await act(async () =>
    root.render(images.map((props) => createElement(VariantImage, { key: props.src, alt: "", ...props }))),
  );
  return [...container.querySelectorAll("img")];
}

it("asks for both variants and lets the slot pick", async () => {
  const [img] = await render({ src: `${CDN}/note-images/1/slot.jpg`, sizes: "240px" });
  expect(img.getAttribute("srcset")).toBe(
    `${CDN}/note-images/1/slot.w480.jpg 480w, ${CDN}/note-images/1/slot.w1080.jpg 1080w`,
  );
  expect(img.getAttribute("sizes")).toBe("240px");
  expect(img.getAttribute("src")).toBe(`${CDN}/note-images/1/slot.w1080.jpg`);
});

it("declares each variant at the width it really has", async () => {
  const [wide, mid] = await render(
    { src: `${CDN}/note-images/1/wide.jpg`, sizes: "573px", width: 2400 },
    { src: `${CDN}/note-images/1/mid.jpg`, sizes: "573px", width: 700 },
  );
  expect(wide.getAttribute("srcset")).toBe(
    `${CDN}/note-images/1/wide.w480.jpg 480w, ${CDN}/note-images/1/wide.w1080.jpg 1080w`,
  );
  expect(mid.getAttribute("srcset")).toBe(
    `${CDN}/note-images/1/mid.w480.jpg 480w, ${CDN}/note-images/1/mid.w1080.jpg 700w`,
  );
});

it("uses the w480 alone for a photo no wider than 480 px, since both variants are the same pixels", async () => {
  const [img] = await render({ src: `${CDN}/note-images/1/small.jpg`, sizes: "400px", width: 400 });
  expect(img.hasAttribute("srcset")).toBe(false);
  expect(img.hasAttribute("sizes")).toBe(false);
  expect(img.getAttribute("src")).toBe(`${CDN}/note-images/1/small.w480.jpg`);
});

it("uses the w1080 alone when the slot isn't known", async () => {
  const [img] = await render({ src: `${CDN}/post-images/1/unsized.png` });
  expect(img.hasAttribute("srcset")).toBe(false);
  expect(img.getAttribute("src")).toBe(`${CDN}/post-images/1/unsized.w1080.png`);
});

it("leaves a remote photo alone", async () => {
  const [img] = await render({ src: "https://picsum.photos/seed/x/800/600", sizes: "240px" });
  expect(img.hasAttribute("srcset")).toBe(false);
  expect(img.getAttribute("src")).toBe("https://picsum.photos/seed/x/800/600");
});

it("falls back to the original once the variant fails, and every copy of that photo follows", async () => {
  const src = `${CDN}/note-images/2/fails.jpg`;
  const [first] = await render({ src, sizes: "240px" }, { src: `${CDN}/note-images/2/fine.jpg`, sizes: "240px" });
  first.setAttribute("data-loaded", "");
  await act(async () => {
    first.dispatchEvent(new Event("error"));
  });
  const [after, untouched] = [...container.querySelectorAll("img")];
  expect(after).toBe(first);
  expect(after.getAttribute("src")).toBe(src);
  expect(after.hasAttribute("srcset")).toBe(false);
  expect(after.hasAttribute("data-loaded")).toBe(false);
  expect(untouched.getAttribute("src")).toBe(`${CDN}/note-images/2/fine.w1080.jpg`);

  await act(async () => root.render(null));
  const [again] = await render({ src, sizes: "240px" });
  expect(again.getAttribute("src")).toBe(src);
  expect(again.hasAttribute("srcset")).toBe(false);
});

it("asks for the variant again once the failure is a minute old", async () => {
  vi.useFakeTimers();
  try {
    const src = `${CDN}/note-images/6/fresh.jpg`;
    const [img] = await render({ src, sizes: "240px" });
    await act(async () => {
      img.dispatchEvent(new Event("error"));
    });
    await act(async () => root.render(null));
    vi.advanceTimersByTime(59_000);
    expect((await render({ src, sizes: "240px" }))[0].getAttribute("src")).toBe(src);
    await act(async () => root.render(null));
    vi.advanceTimersByTime(1_000);
    expect((await render({ src, sizes: "240px" }))[0].getAttribute("src")).toBe(`${CDN}/note-images/6/fresh.w1080.jpg`);
  } finally {
    vi.useRealTimers();
  }
});

it("doesn't loop when the original fails too", async () => {
  const src = `${CDN}/note-images/3/gone.jpg`;
  const onError = vi.fn();
  await act(async () => root.render(createElement(VariantImage, { src, alt: "", sizes: "240px", onError })));
  const img = container.querySelector("img")!;
  await act(async () => {
    img.dispatchEvent(new Event("error"));
  });
  expect(onError).not.toHaveBeenCalled();
  await act(async () => {
    img.dispatchEvent(new Event("error"));
  });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(img.getAttribute("src")).toBe(src);
});

it("catches a variant that broke before React attached its handler", async () => {
  const proto = HTMLImageElement.prototype;
  const spies = [
    vi.spyOn(proto, "complete", "get").mockReturnValue(true),
    vi.spyOn(proto, "naturalWidth", "get").mockReturnValue(0),
    vi.spyOn(proto, "currentSrc", "get").mockReturnValue(`${CDN}/note-images/4/early.w480.jpg`),
  ];
  const [img] = await render({ src: `${CDN}/note-images/4/early.jpg`, sizes: "240px" });
  spies.forEach((spy) => spy.mockRestore());
  expect(img.getAttribute("src")).toBe(`${CDN}/note-images/4/early.jpg`);
  expect(img.hasAttribute("srcset")).toBe(false);
});

it("leaves a lazy photo that hasn't started loading alone", async () => {
  const proto = HTMLImageElement.prototype;
  const spies = [
    vi.spyOn(proto, "complete", "get").mockReturnValue(true),
    vi.spyOn(proto, "naturalWidth", "get").mockReturnValue(0),
    vi.spyOn(proto, "currentSrc", "get").mockReturnValue(""),
  ];
  const [img] = await render({ src: `${CDN}/note-images/5/lazy.jpg`, sizes: "240px" });
  spies.forEach((spy) => spy.mockRestore());
  expect(img.getAttribute("src")).toBe(`${CDN}/note-images/5/lazy.w1080.jpg`);
});
