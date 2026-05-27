"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

const KO = {
  title: String.fromCharCode(0xc7a0, 0xc2dc, 0x0020, 0xbb38, 0xc81c, 0xac00, 0x0020, 0xbc1c, 0xc0dd, 0xd588, 0xc2b5, 0xb2c8, 0xb2e4),
  description: String.fromCharCode(
    0xc0c8,
    0xb85c,
    0xace0,
    0xce68,
    0xd574,
    0xb3c4,
    0x0020,
    0xac19,
    0xc740,
    0x0020,
    0xd654,
    0xba74,
    0xc774,
    0xba74,
    0x0020,
    0xc7a0,
    0xc2dc,
    0x0020,
    0xd6c4,
    0x0020,
    0xb2e4,
    0xc2dc,
    0x0020,
    0xc2dc,
    0xb3c4,
    0xd574,
    0xc8fc,
    0xc138,
    0xc694,
    0x002e,
  ),
  retry: String.fromCharCode(0xb2e4, 0xc2dc, 0x0020, 0xc2dc, 0xb3c4),
};

const JA = {
  title: String.fromCharCode(0x554f, 0x984c, 0x304c, 0x767a, 0x751f, 0x3057, 0x307e, 0x3057, 0x305f),
  description: String.fromCharCode(
    0x518d,
    0x8aad,
    0x307f,
    0x8fbc,
    0x307f,
    0x5f8c,
    0x3082,
    0x540c,
    0x3058,
    0x753b,
    0x9762,
    0x304c,
    0x8868,
    0x793a,
    0x3055,
    0x308c,
    0x308b,
    0x5834,
    0x5408,
    0x306f,
    0x3001,
    0x3057,
    0x3070,
    0x3089,
    0x304f,
    0x3057,
    0x3066,
    0x304b,
    0x3089,
    0x304a,
    0x8a66,
    0x3057,
    0x304f,
    0x3060,
    0x3055,
    0x3044,
    0x3002,
  ),
  retry: String.fromCharCode(0x518d, 0x8a66, 0x884c),
};

function copy() {
  if (typeof navigator === "undefined") {
    return { title: "Something went wrong", description: "Please try again later.", retry: "Retry" };
  }
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("ko")) return KO;
  if (lang.startsWith("ja")) return JA;
  return { title: "Something went wrong", description: "Please try again later.", retry: "Retry" };
}

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
  const text = copy();

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
            {text.title}
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
            {text.description}
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
            {text.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
