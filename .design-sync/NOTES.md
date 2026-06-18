# design-sync notes — kurl Design System

Repo-specific gotchas for syncing this repo to claude.ai/design. Read before any re-sync.

## Shape: app, not a library
- `url-shortener` is a Next.js 14 app, **not** a published component library. There is no
  `dist/` barrel and no shipped `.d.ts`.
- The bundle entry is a hand-written barrel: `.design-sync/ds-entry.tsx`. It re-exports the
  scoped components by their `@/`-aliased source modules and exports `DSProvider`. Pass it via
  `--entry ./.design-sync/ds-entry.tsx`. `@/*` aliases resolve through `cfg.tsconfig`.
- Component list is driven entirely by `cfg.componentSrcMap` (no `.d.ts` to discover from).
  Add a component = add the export to the barrel **and** a `componentSrcMap` entry.

## `exported` is empty → provider gate drops the provider (fixed via fork)
- With no `.d.ts`, `exportedNames()` returns ∅, so `emitPerComponent`'s provider gate
  (`exported.has(provider)`, emit.mjs) silently drops `DSProvider`. Every preview then renders
  without the next-intl context and `useTranslations()` throws a **bare `Error`** (the bundled
  next-intl is the *production* build, which strips the message — don't waste time reading it).
- Fix: `.design-sync/overrides/source-kit.mjs` (declared in `cfg.libOverrides`) wraps the
  bundled adapter and seeds `exported` from the barrel's own named exports. No symlink needed
  (it imports the staged base via relative path; doesn't import bare deps).
- Symptom if this regresses: build prints `[PROVIDER_UNEXPORTED]`, and components using
  `useTranslations` render blank / `root empty`.

## Styling = compiled Tailwind, not a shipped stylesheet
- `cfg.cssEntry` points at `.design-sync/ds-styles.css`, compiled from `app/globals.css` via
  the repo's `tailwind.config.ts`. Regenerate on re-sync if component classes changed:
  `node_modules/.bin/tailwindcss -c tailwind.config.ts -i .design-sync/_tw-input.css -o .design-sync/ds-styles.css --minify`
  (`_tw-input.css` = globals.css minus the `devices.css` `@import`, plus the Pretendard CDN
  `@import` and an explicit `html,body` font-family base).
- Preview chrome (layout wrappers, labels) uses **inline styles**, not Tailwind classes — the
  compiled CSS only contains classes from the app's own content globs, not from preview files.

## Fonts
- Pretendard loads at runtime via a jsDelivr CDN `@import` in the stylesheet (the app does the
  same). `cfg.runtimeFontPrefixes` suppresses the (false) `[FONT_MISSING]` for Pretendard,
  Apple SD Gothic Neo, and JetBrains Mono (all runtime/system).

## Composites pull app infra → stub the heavy/Next deps (preview-only)
The blog/links composite components transitively import Next runtime + the app's data layer.
Bundling that for the browser fails (node builtins) or needs a backend. We redirect those to
preview-only stubs in `.design-sync/stubs/` via `.design-sync/tsconfig.json` paths:
- `process.env.*` reads at module-eval → `.design-sync/ds-process-shim.ts`, imported FIRST in the
  barrel (otherwise the IIFE throws `ReferenceError: process` and the whole bundle dies).
- `next/link`, `next/navigation`, `next/image`, `next-view-transitions` → light stubs (plain `<a>`
  / `<img>` / no-op router). The real ones need the app-router context AND drag `next/router`
  (pages) → `bloom-filter` → `gzip-size` → `fs/stream/zlib` into the browser bundle.
- `@sentry/nextjs` → no-op stub (it pulls the Next pages router too; monitoring is meaningless in
  a preview). It's a `import * as Sentry` namespace import, so the stub exports named no-ops.
- `@/lib/api/stats` → stub returning sample `LinkStats` for code `"spring"` (rejects others) so the
  REAL `KurlLinkCard` renders BOTH its "ok" dashboard and "fallback" states — no reimplementation.

### Contracts (.d.ts) & guidelines
- No `.d.ts` in the app → ts-morph extraction collapses every emitted `<Name>Props` to
  `{ [key: string]: unknown }`, erasing real prop types. `cfg.dtsPropsFor` supplies a hand-written
  body per component (the union/object props the design agent codes against). Keep these in sync
  with the real source props; `import * as React` is already in the emitted `.d.ts`, so `React.*`
  types are fine in the bodies. Pure-native primitives (Card/Table/Skeleton) are left as-is.
- `cfg.guidelinesGlob` allow-lists ONLY design docs (`docs/brand-mark.md`, `docs/discovery-feed.md`).
  Do NOT drop it — the default sweeps all of `docs/*.md`, which ships internal backend/eng docs
  (admin-endpoints, auth-cross-subdomain, feed-home-api, blog-refactor) as "design guidance" — pure
  noise that misleads the design agent (and leaks internal API/security posture).

### tsconfig.json gotchas (these cost real debugging time)
- **No `"//"` comment key** in `.design-sync/tsconfig.json` — the converter's tsconfigPathsPlugin
  strips `//` comments and a `"//"` key mangles the JSON → `JSON.parse` fails → ALL paths silently
  drop (symptom: an import that should map to a stub resolves to the real module).
- **`"@/*"` MUST be LAST** in `paths`. The plugin matches rules in insertion order; a leading wild
  `@/*` shadows every exact `@/lib/...` stub mapping.
- The plugin's empty-extension check matches DIRECTORIES, so a bare-dir value import like
  `import { x } from "@/lib/api"` resolves to the dir and esbuild errors ("is a directory"). Map
  `@/lib/<dir>` → its `index.ts` explicitly (before `@/*`), or avoid the component.

## Dropped / special-cased
- `Toast` (`components/ui/toast.tsx`) exports only `ToastProvider` + `useToast` — no static
  visual component, and toasts auto-dismiss after 2600ms. Not previewable statically; kept
  importable in the bundle (and inside `DSProvider`) but not a card. Skipped per §4.2.
- `SeriesFeedCard` (`modules/blog/components/series-feed-card.tsx`) is an **async (RSC) component**
  — React 18 client can't render it, so it's excluded from the scope. Re-add only if it gets a
  sync client variant.
- `WeeklyInsightsCard` (`components/links/stats/weekly-insights-card.tsx`) self-fetches via the
  whole `@/lib/api` barrel and only ever shows its loading skeleton without a backend — excluded
  to keep the bundle lean. (Could be added with an `@/lib/api`-index stub like KurlLinkCard's.)
- `StatsCards` previews MUST pass `animate={false}` — its `useCountUp` renders `0` in a static
  capture otherwise.
- `ConfirmDialog` is an overlay (`createPortal(document.body)`); `cfg.overrides.ConfirmDialog`
  sets `cardMode: single` + a viewport so the open state renders inside the card. Its focus trap
  auto-focuses the cancel button on mount; the preview wraps each story in an `AtRest` helper that
  blurs after rAF so the static capture doesn't freeze a misleading green focus ring.
- `StatsCards`' signature 1.5x-hero KPI strip only renders at the Tailwind `lg:` (≥1024px) VIEWPORT
  breakpoint — a wrapper `maxWidth` can't trigger a media query. `cfg.overrides.StatsCards.viewport`
  = `1280x760` captures it at desktop width. Previews also pass `animate={false}` (count-up shows 0
  in a static capture otherwise).
- `Avatar` image-vs-initials previews must use a clearly photo-like data-URI (gradient + shapes, NO
  text) for the image sweep — a flat-fill or lettered tile looks identical to the initials disc and
  the variant axis reads as not varying.

## Known, deliberately deferred (NOT bugs in this sync)
- `ds-bundle/README.md` calls the source a "published library" and labels Tailwind runtime CSS vars
  as brand "tokens" — both come from the converter's `emitReadme` template (don't-fork), so they're
  not fixable via config. Human-facing only; low impact.
- App i18n bug (separate from design-sync): `components/links/stats/cards.tsx` hardcodes English
  `"… % of human"` in the hero subline (the satellite card uses `t("uniqueOfHuman")`). Fix in app
  code + `messages/ko.json` if/when touching that component; it's visible in the StatsCards preview.

## Re-sync risks
- The Tailwind CSS is a build-time snapshot — if component classes change, re-run the
  tailwindcss compile above or designs render with stale/missing utilities.
- Pretendard is fetched from a public CDN at render time; if jsDelivr is unreachable the DS
  pane falls back to system fonts.
- `DSProvider` supplies preview-only context (next-intl ko). Next routing is stubbed, not
  context-provided. If a newly-scoped component reads a context not covered, extend `DSProvider`.
- Locale for all previews is **ko** (brand-primary). Switch `koMessages` in the barrel to change it.
- The `.design-sync/stubs/*` are preview-only fakes. If a component starts reading a stubbed API's
  fields the stub doesn't return (e.g. KurlLinkCard reads new `LinkStats` fields), extend the stub
  or that cell renders incomplete. The stubs intentionally implement only what scoped components use.
- Adding a composite often means a new transitive infra dep → a new stub + tsconfig entry. Build,
  read the esbuild "Could not resolve"/"is a directory" error, add the stub, repeat.
