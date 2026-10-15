import { request } from "@/lib/api/client";

const importMocks: typeof import("./_mocks-imports") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks-imports") : null;

export const IMPORT_PLATFORMS = ["NAVER", "TISTORY", "VELOG", "BRUNCH"] as const;
export type ImportPlatform = (typeof IMPORT_PLATFORMS)[number];

export interface ImportPreviewItem {
  title: string;
  url: string;
  publishedAt: string | null;
  excerpt: string | null;
  imageUrl: string | null;
}

export interface ImportPreview {
  platform: ImportPlatform;
  blogUrl: string;
  blogTitle: string;
  fullContent: boolean;
  items: ImportPreviewItem[];
}

export type ImportStatus = "PENDING_VERIFICATION" | "IMPORTING" | "SYNCING" | "ERROR" | "DISCONNECTED";

export interface ImportProgress {
  total: number;
  done: number;
  failed: number;
}

export interface ImportSource {
  id: number;
  platform: ImportPlatform;
  blogUrl: string;
  blogTitle: string;
  status: ImportStatus;
  verificationCode: string | null;
  fullContent: boolean;
  importedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  announceNewPosts: boolean;
  showInDiscover: boolean;
  progress: ImportProgress | null;
}

export type ImportSourcePatch = Partial<Pick<ImportSource, "announceNewPosts" | "showInDiscover">>;

export function previewImport(url: string): Promise<ImportPreview> {
  if (importMocks) return importMocks.mockPreview(url);
  return request<ImportPreview>("/api/v1/imports/preview", { method: "POST", body: { url } });
}

export function createImportSource(url: string): Promise<ImportSource> {
  if (importMocks) return importMocks.mockCreateSource(url);
  return request<ImportSource>("/api/v1/imports/sources", { method: "POST", body: { url } });
}

export function verifyImportSource(id: number): Promise<ImportSource> {
  if (importMocks) return importMocks.mockVerifySource(id);
  return request<ImportSource>(`/api/v1/imports/sources/${id}/verify`, { method: "POST" });
}

export function listImportSources(): Promise<ImportSource[]> {
  if (importMocks) return importMocks.mockListSources();
  return request<{ items: ImportSource[] }>("/api/v1/imports/sources", { method: "GET" }).then((page) => page.items);
}

export function getImportSource(id: number): Promise<ImportSource> {
  if (importMocks) return importMocks.mockGetSource(id);
  return request<ImportSource>(`/api/v1/imports/sources/${id}`, { method: "GET" });
}

export function updateImportSource(id: number, patch: ImportSourcePatch): Promise<ImportSource> {
  if (importMocks) return importMocks.mockUpdateSource(id, patch);
  return request<ImportSource>(`/api/v1/imports/sources/${id}`, { method: "PATCH", body: patch });
}

export function deleteImportSource(id: number, keepPosts: boolean): Promise<void> {
  if (importMocks) return importMocks.mockDeleteSource(id, keepPosts);
  return request<void>(`/api/v1/imports/sources/${id}?keepPosts=${keepPosts}`, { method: "DELETE" });
}
