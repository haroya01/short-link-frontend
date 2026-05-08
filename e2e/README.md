# E2E test suite

Playwright tests covering all user-visible flows.

## Run locally

You need both backend and frontend up:

```bash
# in the backend repo (../short-link)
docker compose -f resources/docker-compose.yml up -d
SPRING_PROFILES_ACTIVE=test ./gradlew bootRun

# in this repo
npm run dev   # http://localhost:3001

# in another terminal
npm run e2e            # headless
npm run e2e:headed     # with browser window
```

The `dev-login` endpoint (`@Profile({"local","test"})`) is required for auth specs.
Set `SPRING_PROFILES_ACTIVE=test` (or `local`) so it's exposed.

## Update visual baselines

```bash
npx playwright test e2e/visual.spec.ts --update-snapshots
```

Commit the regenerated PNGs under `e2e/visual.spec.ts-snapshots/`.

## CI

`.github/workflows/e2e.yml` clones the backend repo, boots both servers, and runs the full
suite on every PR/push to main. Failures upload `playwright-report/` as an artifact.

### One-time setup

The workflow needs to clone the (private) backend repo. Set a Personal Access Token with
`repo` scope as a secret on this repo:

```
gh secret set SUB_TOKEN --repo haroya01/short-link-frontend
# paste a PAT (classic) with repo scope, or a fine-grained PAT scoped to haroya01/short-link
```

Without `SUB_TOKEN`, the workflow gracefully skips with a warning instead of failing.

Optional secrets (otherwise generated/defaulted at runtime):
- `E2E_JWT_PRIVATE_KEY`, `E2E_JWT_PUBLIC_KEY` — RSA PEM for JWT signing (auto-generated otherwise)
- `E2E_DB_PASSWORD`, `E2E_REDIS_PASSWORD` — overrides for docker-compose passwords

## Coverage map

| Spec | Covers |
|---|---|
| `anonymous-shorten` | hero, form validation, result card, login CTA, FAQ accordion, live counters |
| `utm-builder` | UTM params appended to redirect Location, empty fields skipped |
| `recent-links` | localStorage persistence across reload |
| `dashboard` | list, search, delete (auth) |
| `stats` | empty state, totals after clicks, public toggle + /public route |
| `settings` | profile, timezone save, delete-confirm gating |
| `og-preview` | bot UA → OG html, regular UA → 302, X-Robots-Tag noindex |
| `marketing-pages` | /about /pricing /terms /privacy + robots.txt + sitemap.xml |
| `not-found` | friendly 404 |
| `mobile-nav` | iPhone hamburger toggle, no horizontal overflow |
| `i18n` | ko/en/ja hero text, hreflang alternates |
| `a11y` | axe-core on 6 public pages (no critical/serious) |
| `visual` | full-page screenshot snapshots on 6 pages |
| `auth-redirect` | unauthenticated dashboard/stats redirect to login |
| `api-smoke` | backend API status codes via Next proxy |
