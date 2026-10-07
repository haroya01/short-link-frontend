import { request } from "@/lib/api/client";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

/** One Mastodon import (merge): lines stored, applied in the background, counted as they go. */
export interface AccountImport {
  id: number;
  kind: string;
  total: number;
  processed: number;
  imported: number;
  finished: boolean;
  createdAt: string | null;
}

let mockImports: AccountImport[] = [
  {
    id: 31,
    kind: "FOLLOWING",
    total: 120,
    processed: 120,
    imported: 116,
    finished: true,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

export function startAccountImport(kind: string, csv: string): Promise<AccountImport> {
  if (USE_MOCKS) {
    const lines = csv.split("\n").filter((l) => l.trim()).length;
    const started: AccountImport = {
      id: 32 + mockImports.length,
      kind: kind.toUpperCase().replace("-", "_"),
      total: lines,
      processed: 0,
      imported: 0,
      finished: false,
      createdAt: new Date().toISOString(),
    };
    mockImports = [started, ...mockImports];
    return Promise.resolve(started);
  }
  return request<AccountImport>("/api/v1/users/me/imports", { method: "POST", body: { kind, csv } });
}

export function listAccountImports(): Promise<AccountImport[]> {
  if (USE_MOCKS) {
    mockImports = mockImports.map((i) => {
      if (i.finished) return i;
      const processed = Math.min(i.total, i.processed + Math.max(1, Math.ceil(i.total / 2)));
      return { ...i, processed, imported: processed, finished: processed >= i.total };
    });
    return Promise.resolve(mockImports);
  }
  return request<AccountImport[]>("/api/v1/users/me/imports", { method: "GET" });
}
