# E2E test suite

Playwright tests covering user-visible flows. No backend is needed: every spec either mocks the API
at the Playwright layer (`page.route`) or runs against the app's own mock data.

## Run locally

Two lanes, each against a production build on port 3001:

```bash
# Playwright-mocked lane (.github/workflows/e2e-mock.yml)
NEXT_PUBLIC_API_BASE=http://localhost:0 npm run build
PORT=3001 npm start
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/dashboard.spec.ts

# App-mock-data lane (.github/workflows/e2e-mock-on.yml)
NEXT_PUBLIC_USE_MOCKS=1 NEXT_PUBLIC_API_BASE=http://localhost:0 npm run build
PORT=3001 npm start
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/blog-screens.spec.ts
```

Each workflow lists the specs it runs — add a new spec to exactly one of them.

## Mock helpers

- `helpers/mock-backend.ts` — `signIn(page)` seeds a stub access token; `mockBackend(page, handlers)`
  answers `/api/v1/**` with a signed-in `/users/me`, common account defaults, then the links mock
  data (`lib/api/_links-mocks.ts`). Pass `"METHOD /path"` handlers to override or record writes.
- `helpers/mock-shorten.ts` — anonymous shorten (PoW challenge + `POST /api/v1/links`).

Server-rendered pages that fetch the backend directly (e.g. the public event page `/e/[slug]`)
can't be mocked this way and are not covered.

## Update visual baselines

```bash
npx playwright test e2e/visual.spec.ts --update-snapshots
```

Commit the regenerated PNGs under `e2e/visual.spec.ts-snapshots/`.
