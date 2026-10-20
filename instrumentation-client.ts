import * as Sentry from "@sentry/nextjs";
import { validSentryDsn } from "@/lib/sentry-dsn";

const dsn = validSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);

// Load Replay from the Sentry CDN off the boot critical path so neither its code nor its recording
// buffers cost anything while the app is still hydrating. Replay stays in buffer mode
// (replaysOnErrorSampleRate: 1.0) - it only misses the rare crash within the first idle window
// after load, or when the CDN script is blocked.
function whenIdle(callback: () => void): void {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(callback, { timeout: 4000 });
  } else {
    window.setTimeout(callback, 2000);
  }
}

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });

  whenIdle(() => {
    Sentry.lazyLoadIntegration("replayIntegration")
      .then((replay) => Sentry.getClient()?.addIntegration(replay({ maskAllText: false, blockAllMedia: true })))
      .catch(() => undefined);
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
