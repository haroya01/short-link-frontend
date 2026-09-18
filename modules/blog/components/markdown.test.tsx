import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Markdown } from "./markdown";

beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

function render(markdown: string, inline = false) {
  const root = document.createElement("template");
  root.innerHTML = renderToStaticMarkup(<Markdown inline={inline}>{markdown}</Markdown>);
  return root.content;
}

describe("reader markdown images", () => {
  it("reserves image space and cleans dimension markers in legacy paragraphs", () => {
    const root = render("Before ![«546x588» Circuit](https://example.com/circuit.png) after");
    const image = root.querySelector("img")!;
    expect(image.alt).toBe("Circuit");
    expect(image.getAttribute("width")).toBe("546");
    expect(image.getAttribute("height")).toBe("588");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(root.textContent).toContain("Before  after");
  });

  it("also defers images nested in lists and inline markdown", () => {
    for (const root of [render("- ![Diagram](https://example.com/diagram.png)"), render("![Diagram](https://example.com/diagram.png)", true)]) {
      const image = root.querySelector("img")!;
      expect(image.getAttribute("loading")).toBe("lazy");
      expect(image.hasAttribute("width")).toBe(false);
      expect(image.alt).toBe("Diagram");
    }
  });

  it("keeps raw HTML sanitization when rendering images", () => {
    const root = render('<img src="javascript:alert(1)" onerror="alert(1)" alt="Diagram"><script>alert(1)</script>');
    expect(root.querySelector("script")).toBeNull();
    const image = root.querySelector("img")!;
    expect(image.hasAttribute("onerror")).toBe(false);
    expect(image.getAttribute("src") ?? "").not.toContain("javascript:");
  });
});
