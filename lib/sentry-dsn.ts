/**
 * A Sentry DSN is `https://<key>@<host>/<projectId>`. A truncated / half-pasted env value makes
 * `Sentry.init` log "Invalid Sentry Dsn" on every page load. Validate the shape first and return
 * undefined when it doesn't match, so init is simply skipped instead of erroring.
 */
export function validSentryDsn(raw: string | undefined): string | undefined {
  const dsn = raw?.trim();
  return dsn && /^https?:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(dsn) ? dsn : undefined;
}
