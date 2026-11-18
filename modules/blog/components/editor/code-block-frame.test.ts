import { describe, expect, it } from "vitest";
import { codeBlockFrame, pickerLanguage, showLanguage } from "./code-block-frame";

describe("the language a fence is shown as", () => {
  it("maps the short names people type to the entry the picker lists", () => {
    expect(pickerLanguage("js")).toBe("javascript");
    expect(pickerLanguage("ts")).toBe("typescript");
    expect(pickerLanguage("py")).toBe("python");
    expect(pickerLanguage("sh")).toBe("bash");
    expect(pickerLanguage("yml")).toBe("yaml");
    expect(pickerLanguage("TS")).toBe("typescript");
  });

  it("keeps a listed name and treats text as plaintext", () => {
    expect(pickerLanguage("kotlin")).toBe("kotlin");
    expect(pickerLanguage("")).toBe("");
    expect(pickerLanguage("text")).toBe("");
  });

  it("is not fooled by object property names", () => {
    expect(pickerLanguage("constructor")).toBe("constructor");
  });
});

describe("the code block's language picker", () => {
  const shown = (select: HTMLSelectElement) => select.selectedOptions[0]?.textContent ?? null;

  it("shows the full name for an alias fence instead of going blank", () => {
    const { languageSelect } = codeBlockFrame("Language", "js");
    expect(shown(languageSelect)).toBe("javascript");
  });

  it("shows plaintext for a fence with no language", () => {
    const { languageSelect } = codeBlockFrame("Language", "");
    expect(shown(languageSelect)).toBe("plaintext");
  });

  it("shows a language it does not list as written, once", () => {
    const { languageSelect } = codeBlockFrame("Language", "swift");
    expect(shown(languageSelect)).toBe("swift");
    const before = languageSelect.options.length;
    showLanguage(languageSelect, "swift");
    expect(languageSelect.options.length).toBe(before);
  });

  it("follows a later change of the fence", () => {
    const { languageSelect } = codeBlockFrame("Language", "js");
    showLanguage(languageSelect, "yml");
    expect(shown(languageSelect)).toBe("yaml");
  });
});
