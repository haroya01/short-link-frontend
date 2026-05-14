"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "48px 24px",
          textAlign: "center",
          color: "#0f172a",
          background: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            잠시 문제가 발생했습니다
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
            새로고침해도 같은 화면이면 잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#0f172a",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
