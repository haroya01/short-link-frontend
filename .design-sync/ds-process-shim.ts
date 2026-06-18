// Next app components read `process.env.NEXT_PUBLIC_*` at module-eval time. The
// browser (both the preview harness and real claude.ai/design renders) has no
// `process`, so without this the bundle's IIFE throws ReferenceError before
// window.<global> is ever assigned and EVERY component breaks. Imported first in
// the barrel so it runs before any component module evaluates; the reads then
// return undefined instead of throwing.
declare const globalThis: { process?: { env: Record<string, string | undefined> } };
globalThis.process = globalThis.process || { env: { NODE_ENV: "production" } };
