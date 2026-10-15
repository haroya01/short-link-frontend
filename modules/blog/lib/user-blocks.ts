"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";
import { blockUser, listBlockedUsers, unblockUser, type BlockedUser } from "@/modules/blog/api/follows";
import { emitFollowChanged } from "@/modules/blog/lib/consequence-events";

const NONE: ReadonlySet<string> = new Set();

let current: BlockedUser[] = [];
let names: ReadonlySet<string> = NONE;
let loadedFor: number | null = null;
let version = 0;
const listeners = new Set<() => void>();

function publish(next: BlockedUser[]) {
  current = next;
  names = new Set(next.map((u) => u.username));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function reload() {
  const at = version;
  return listBlockedUsers().then((users) => {
    if (version === at) publish(users);
  });
}

function useHydrated() {
  const { authenticated, me } = useAuth();
  const userId = authenticated ? (me?.id ?? null) : null;
  useEffect(() => {
    if (userId === null) {
      loadedFor = null;
      if (current.length > 0) publish([]);
      return;
    }
    if (loadedFor === userId) return;
    loadedFor = userId;
    reload().catch(() => {
      loadedFor = null;
    });
  }, [userId]);
}

/** The signed-in viewer's blocked accounts, fetched once per account and shared by every surface. */
export function useBlockedUsers(): BlockedUser[] {
  useHydrated();
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** Usernames whose posts, comments and notes the viewer no longer sees. */
export function useBlockedNames(): ReadonlySet<string> {
  useHydrated();
  return useSyncExternalStore(subscribe, () => names, () => NONE);
}

/** Re-reads the list from the server — the settings list shows blocks made on other devices too. */
export function refreshBlockedUsers(): Promise<void> {
  return reload();
}

export async function blockAuthor(username: string) {
  const before = current;
  version += 1;
  publish([{ id: 0, username, avatarUrl: null }, ...current.filter((u) => u.username !== username)]);
  try {
    await blockUser(username);
  } catch (e) {
    version += 1;
    publish(before);
    throw e;
  }
  emitFollowChanged();
  reload().catch(() => {});
}

export async function unblockAuthor(username: string) {
  const before = current;
  version += 1;
  publish(current.filter((u) => u.username !== username));
  try {
    await unblockUser(username);
  } catch (e) {
    version += 1;
    publish(before);
    throw e;
  }
}
