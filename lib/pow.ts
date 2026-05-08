/**
 * Proof-of-work helper for anonymous shorten. The backend issues a challenge + difficulty;
 * we find a nonce such that SHA-256(challenge + ":" + nonce) starts with N hex zeros and
 * include the pair as headers on the next POST.
 *
 * Mining runs on the main thread (Web Crypto SubtleCrypto is async-friendly so it doesn't
 * block UI). At difficulty=4 (~65k iterations) it completes well under a second on any
 * modern device — invisible to humans, costly at bot scale.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const CHALLENGE_ENDPOINT = API_BASE + "/api/v1/pow/challenge";

export type PowToken = {
  challenge: string;
  nonce: string;
};

type IssuedChallenge = {
  challenge: string;
  difficulty: number;
  enforced: boolean;
};

let cached: Promise<PowToken | null> | null = null;

export async function getPowToken(): Promise<PowToken | null> {
  if (cached) return cached;
  cached = mineFresh().catch(() => null);
  return cached;
}

export function clearPowToken() {
  cached = null;
}

async function mineFresh(): Promise<PowToken | null> {
  const issued = await fetchChallenge();
  if (!issued.enforced) return null;
  const nonce = await mineProof(issued.challenge, issued.difficulty);
  return { challenge: issued.challenge, nonce };
}

async function fetchChallenge(): Promise<IssuedChallenge> {
  const res = await fetch(CHALLENGE_ENDPOINT, { method: "GET" });
  if (!res.ok) throw new Error(`pow challenge HTTP ${res.status}`);
  return (await res.json()) as IssuedChallenge;
}

async function mineProof(challenge: string, difficulty: number): Promise<string> {
  const encoder = new TextEncoder();
  const prefix = "0".repeat(difficulty);
  for (let i = 0; i < 5_000_000; i++) {
    const nonce = i.toString();
    const buf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`${challenge}:${nonce}`),
    );
    const hex = bufferToHex(buf);
    if (hex.startsWith(prefix)) return nonce;
    // Yield to the event loop every 1024 iterations so the page stays responsive
    if ((i & 0x3ff) === 0) await sleep(0);
  }
  throw new Error("pow mining exceeded iteration cap");
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
