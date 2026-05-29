// @toast-ui/editor ships types at /types but its package.json "exports" map hides them from
// TS module resolution. Declare the minimal surface this app uses (constructor + the two methods).
declare module "@toast-ui/editor" {
  export interface ToastUIEditorOptions {
    el: HTMLElement;
    [key: string]: unknown;
  }
  export default class Editor {
    constructor(options: ToastUIEditorOptions);
    getMarkdown(): string;
    destroy(): void;
  }
}

declare module "@toast-ui/editor-plugin-color-syntax" {
  const colorSyntax: (...args: unknown[]) => unknown;
  export default colorSyntax;
}
