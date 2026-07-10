import * as Sentry from "@sentry/nextjs";
import { validSentryDsn } from "@/lib/sentry-dsn";

const dsn = validSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);

// Schedule Replay setup off the boot critical path so its recording buffers
// don't add init cost / CPU while the app is still hydrating. Replay stays
// self-hosted and in buffer mode (replaysOnErrorSampleRate: 1.0) - it only
// misses the rare crash within the first idle window after load.
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
    Sentry.getClient()?.addIntegration(
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
    );
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
