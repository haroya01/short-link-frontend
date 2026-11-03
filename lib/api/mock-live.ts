import { readStorageJson, readStorageString } from "@/lib/storage-json";

const MOCK_LIVE_KEY = "kurl:mock-live";

type MockLiveArrivals = {
  comments?: { id: number; parentId?: number | null; body: string }[];
  replies?: { id: number; inReplyToId: number; body: string }[];
  room?: { id: number; roomId: number; body: string }[];
};

const isArrivals = (value: unknown): value is MockLiveArrivals => typeof value === "object" && value !== null;

export function mockLiveOn(): boolean {
  return readStorageString(MOCK_LIVE_KEY) !== null;
}

export function mockLiveArrivals(): MockLiveArrivals {
  return readStorageJson(MOCK_LIVE_KEY, isArrivals, {});
}
