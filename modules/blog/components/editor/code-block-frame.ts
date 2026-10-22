const CODE_LANGUAGES = [
  "plaintext", "javascript", "typescript", "jsx", "tsx", "json", "html", "css",
  "python", "java", "kotlin", "go", "rust", "c", "cpp", "csharp", "php", "ruby",
  "sql", "yaml", "bash", "markdown",
];

export interface CodeBlockFrame {
  dom: HTMLElement;
  languageSelect: HTMLSelectElement;
  body: HTMLElement;
}

export function codeBlockFrame(languageLabel: string, language: string): CodeBlockFrame {
  const dom = document.createElement("div");
  dom.className = "cm-codeblock relative my-4 overflow-hidden rounded-2xl bg-slate-900 text-slate-100";

  const bar = document.createElement("div");
  bar.className = "flex items-center justify-between border-b border-white/10 px-3 py-1.5";
  bar.contentEditable = "false";

  const dots = document.createElement("span");
  dots.className = "flex items-center gap-1.5";
  for (const color of ["#f87171", "#fbbf24", "#34d399"]) {
    const dot = document.createElement("span");
    dot.style.cssText = `width:9px;height:9px;border-radius:9999px;background:${color};display:inline-block`;
    dots.append(dot);
  }

  const languageSelect = document.createElement("select");
  languageSelect.className =
    "cursor-pointer rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-200 outline-none transition-colors hover:bg-white/10 hover:text-white";
  languageSelect.title = languageLabel;
  languageSelect.setAttribute("aria-label", languageLabel);
  for (const lang of CODE_LANGUAGES) {
    const opt = document.createElement("option");
    opt.value = lang === "plaintext" ? "" : lang;
    opt.textContent = lang;
    opt.className = "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100";
    languageSelect.append(opt);
  }
  languageSelect.value = language;
  languageSelect.addEventListener("mousedown", (e) => e.stopPropagation());
  bar.append(dots, languageSelect);

  const body = document.createElement("div");
  body.className = "px-3 py-2";

  dom.append(bar, body);
  return { dom, languageSelect, body };
}
