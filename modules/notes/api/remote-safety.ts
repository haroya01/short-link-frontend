import { mockFailure, request } from "@/lib/api/client";
import type { RemoteAccount } from "./notes";

const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const REMOTE_SUGGESTION_LIMIT = 5;
const LIST_SIZE = 50;

/** Backend contract: GET /api/v1/federation/blocks and /federation/accounts/suggestions. */
export interface RemoteAccountsBody {
  items: RemoteAccount[];
}

export interface RemoteMute {
  account: RemoteAccount;
  expiresAt: string | null;
  notifications: boolean;
}

/** Backend contract: GET /api/v1/federation/mutes. */
export interface RemoteMutesBody {
  items: RemoteMute[];
}

export function knowsRemoteSafety(account: RemoteAccount): boolean {
  return typeof account.blocking === "boolean" && typeof account.muting === "boolean";
}

export function hiddenFromViewer(account: RemoteAccount): boolean {
  return account.domainBlocked === true || account.blocking === true;
}

export function setRemoteBlocked(id: number, on: boolean): Promise<RemoteAccount> {
  if (noteMocks) return mockFailure("remote-block") ?? noteMocks.mockSetRemoteBlocked(id, on);
  return request<RemoteAccount>(`/api/v1/federation/accounts/${id}/block`, { method: on ? "PUT" : "DELETE" });
}

/** `duration` in seconds; null mutes until undone, as on Mastodon. */
export function muteRemote(id: number, notifications: boolean, duration: number | null): Promise<RemoteAccount> {
  if (noteMocks) return mockFailure("remote-mute") ?? noteMocks.mockMuteRemote(id, notifications, duration);
  return request<RemoteAccount>(`/api/v1/federation/accounts/${id}/mute`, {
    method: "PUT",
    body: { notifications, duration },
  });
}

export function unmuteRemote(id: number): Promise<RemoteAccount> {
  if (noteMocks) return mockFailure("remote-mute") ?? noteMocks.mockUnmuteRemote(id);
  return request<RemoteAccount>(`/api/v1/federation/accounts/${id}/mute`, { method: "DELETE" });
}

function query(params: Record<string, number>): string {
  return new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
}

export async function listRemoteBlocks(): Promise<RemoteAccount[] | null> {
  try {
    const body = noteMocks
      ? await (mockFailure("remote-blocks") ?? noteMocks.mockRemoteBlocks())
      : await request<RemoteAccountsBody>(`/api/v1/federation/blocks?${query({ page: 0, size: LIST_SIZE })}`, {
          method: "GET",
        });
    return Array.isArray(body?.items) ? body.items : null;
  } catch {
    return null;
  }
}

export async function listRemoteMutes(): Promise<RemoteMute[] | null> {
  try {
    const body = noteMocks
      ? await (mockFailure("remote-mutes") ?? noteMocks.mockRemoteMutes())
      : await request<RemoteMutesBody>(`/api/v1/federation/mutes?${query({ page: 0, size: LIST_SIZE })}`, {
          method: "GET",
        });
    return Array.isArray(body?.items) ? body.items.filter((mute) => mute?.account) : null;
  } catch {
    return null;
  }
}

export async function listRemoteSuggestions(limit = REMOTE_SUGGESTION_LIMIT): Promise<RemoteAccount[]> {
  try {
    const body = noteMocks
      ? await (mockFailure("remote-suggestions") ?? noteMocks.mockRemoteSuggestions(limit))
      : await request<RemoteAccountsBody>(`/api/v1/federation/accounts/suggestions?${query({ limit })}`, {
          method: "GET",
        });
    return Array.isArray(body?.items) ? body.items.filter((account) => !hiddenFromViewer(account)) : [];
  } catch {
    return [];
  }
}
