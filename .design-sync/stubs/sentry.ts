// Preview-only stub for @sentry/nextjs. The real package pulls the Next *pages*
// router (bloom-filter → gzip-size → fs/stream/zlib) into the browser bundle, and
// error monitoring is meaningless in a design preview. Mapped in via
// .design-sync/tsconfig.json paths. Imported as `import * as Sentry`.
const noop = () => {};
const scope = { setTag: noop, setTags: noop, setUser: noop, setContext: noop, setExtra: noop, setExtras: noop, setLevel: noop, clear: noop };
export const init = noop;
export const captureException = noop;
export const captureMessage = noop;
export const captureEvent = noop;
export const addBreadcrumb = noop;
export const setUser = noop;
export const setTag = noop;
export const setTags = noop;
export const setContext = noop;
export const setExtra = noop;
export const setExtras = noop;
export const withScope = (cb?: (s: typeof scope) => void) => cb?.(scope);
export const configureScope = (cb?: (s: typeof scope) => void) => cb?.(scope);
export const getCurrentScope = () => scope;
export const startSpan = (_opts: unknown, cb?: () => unknown) => cb?.();
export const startInactiveSpan = () => ({ end: noop });
export const flush = () => Promise.resolve(true);
export const close = () => Promise.resolve(true);
