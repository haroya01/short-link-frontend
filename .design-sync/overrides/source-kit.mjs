// forked from design-sync lib/source-kit.mjs — this repo is a Next.js app, not a
// published component library, so it ships no .d.ts. exportedNames() therefore
// returns an empty set, and emitPerComponent's provider gate (exported.has(provider))
// silently drops DSProvider — every preview then renders without the next-intl
// context and useTranslations() throws. We wrap the bundled adapter and seed
// `exported` from the --entry barrel's own named exports (the authoritative export
// list for an app-shape repo), which also lets REPLACES and the import shim's
// component-redirect see the real surface.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePackage as base } from "../../.ds-sync/lib/source-kit.mjs";

export async function resolvePackage(ctx) {
  const res = await base(ctx);
  const entry = ctx.ENTRY_OVERRIDE;
  if (entry) {
    res.exported ??= new Set();
    const src = readFileSync(resolve(entry), "utf8");
    // export { A, B as C } from "..."  and  export { A, B }
    for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
      for (const part of m[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) res.exported.add(name);
      }
    }
    // export (async) function/const/let/var/class Name
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) {
      res.exported.add(m[1]);
    }
  }
  return res;
}
