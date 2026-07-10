import { createHash } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";

// Anonymous shorten requires a proof-of-work token: fetch a challenge, mine a nonce whose
// SHA-256(challenge:nonce) starts with `difficulty` hex zeros, then send both as headers on the
// POST. Authenticated callers (Bearer token) skip PoW entirely. If the backend has enforcement
// off (`enforced: false`, e.g. an older profile), we send nothing — the server ignores the
// headers. Mirrors the browser miner in lib/pow.ts, run server-side against the Next proxy.

type IssuedChallenge = {
  challenge: string;
  difficulty: number;
  enforced: boolean;
};

export type PowHeaders = { "X-Pow-Challenge": string; "X-Pow-Nonce": string };

/**
 * Returns PoW headers ready to attach to POST /api/v1/links, or {} when enforcement is off.
 * Goes through the same Next.js proxy the specs use, so `request` must share their base URL.
 */
export async function powHeaders(request: APIRequestContext): Promise<PowHeaders | {}> {
  const res = await request.get("/api/v1/pow/challenge");
  if (!res.ok()) {
    throw new Error(`pow challenge failed (${res.status()}): ${await res.text()}`);
  }
  const issued = (await res.json()) as IssuedChallenge;
  if (!issued.enforced) return {};
  const nonce = mineProof(issued.challenge, issued.difficulty);
  return { "X-Pow-Challenge": issued.challenge, "X-Pow-Nonce": nonce };
}

function mineProof(challenge: string, difficulty: number): string {
  const prefix = "0".repeat(difficulty);
  for (let i = 0; i < 50_000_000; i++) {
    const nonce = i.toString();
    const hex = createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
    if (hex.startsWith(prefix)) return nonce;
  }
  throw new Error("pow mining exceeded iteration cap");
}
