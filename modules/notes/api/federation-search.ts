import { ApiError, mockFailure, request } from "@/lib/api/client";
import { looksLikeRemoteHandle, remoteQueryDomain } from "@/modules/notes/lib/remote-handle";
import { lookupRemoteAccount, type Note, type RemoteAccount } from "./notes";

const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const REMOTE_SEARCH_LIMIT = 5;
const REMOTE_SEARCH_MIN_QUERY = 2;

/** Backend contract: GET /api/v1/federation/accounts/search?q=&limit= (anonymous allowed). */
export interface RemoteAccountSearchBody {
  items: RemoteAccount[];
}

/** Backend contract: GET /api/v1/federation/resolve?q= (signed in only). */
export interface RemoteResolveBody {
  account: RemoteAccount | null;
  note: Note | null;
}

export type RemoteResolution =
  | { state: "account"; account: RemoteAccount }
  | { state: "note"; note: Note }
  | { state: "missing"; domain: string }
  | { state: "unreachable"; domain: string }
  | { state: "signin" }
  | { state: "hidden" };

export function remoteSearchQuery(raw: string): string {
  const q = raw.trim();
  return q.startsWith("@") ? q.slice(1).trim() : q;
}

export async function searchRemoteAccounts(
  raw: string,
  limit = REMOTE_SEARCH_LIMIT,
): Promise<RemoteAccount[] | null> {
  const q = remoteSearchQuery(raw);
  if (Array.from(q).length < REMOTE_SEARCH_MIN_QUERY) return [];
  try {
    const params = new URLSearchParams({ q, limit: String(limit) });
    const body = noteMocks
      ? await (mockFailure("remote-search") ?? noteMocks.mockSearchRemote(q, limit))
      : await request<RemoteAccountSearchBody>(`/api/v1/federation/accounts/search?${params.toString()}`, {
          method: "GET",
        });
    return Array.isArray(body?.items) ? body.items : null;
  } catch {
    return null;
  }
}

export async function resolveRemote(raw: string): Promise<RemoteResolution> {
  const q = raw.trim();
  const domain = remoteQueryDomain(q);
  if (!domain) return { state: "hidden" };
  try {
    const body = noteMocks
      ? await noteMocks.mockResolveRemote(q)
      : await request<RemoteResolveBody>(`/api/v1/federation/resolve?${new URLSearchParams({ q }).toString()}`, {
          method: "GET",
        });
    if (body?.note) return { state: "note", note: body.note };
    if (body?.account) return { state: "account", account: body.account };
    return { state: "missing", domain };
  } catch (error) {
    if (!routeMissing(error)) return failure(error, domain);
    if (!looksLikeRemoteHandle(q)) return { state: "hidden" };
    return lookupRemoteAccount(q).then(
      (account): RemoteResolution => ({ state: "account", account }),
      (lookupError) => failure(lookupError, domain),
    );
  }
}

function routeMissing(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 404) return false;
  const code = error.detail.code;
  return code === undefined || code === "NOT_FOUND";
}

function failure(error: unknown, domain: string): RemoteResolution {
  if (!(error instanceof ApiError)) return { state: "hidden" };
  if (error.status === 401) return { state: "signin" };
  switch (error.detail.code) {
    case "REMOTE_ACCOUNT_NOT_FOUND":
    case "REMOTE_ACCOUNT_INVALID":
      return { state: "missing", domain };
    case "REMOTE_SERVER_UNREACHABLE":
    case "TIMEOUT":
      return { state: "unreachable", domain };
    default:
      return { state: "hidden" };
  }
}
