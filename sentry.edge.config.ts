import * as Sentry from "@sentry/nextjs";
import { validSentryDsn } from "@/lib/sentry-dsn";

const dsn = validSentryDsn(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}
