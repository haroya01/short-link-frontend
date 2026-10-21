import { fetchPublic } from "@/modules/blog/api/public-posts";
import type { RoomInviteLanding } from "./rooms";

const roomMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export async function fetchRoomInviteLanding(code: string): Promise<RoomInviteLanding | null> {
  if (roomMocks) return roomMocks.mockLanding(code);
  const result = await fetchPublic<RoomInviteLanding>(`/api/v1/public/room-invites/${encodeURIComponent(code)}`, {
    noStore: true,
  });
  return result.ok ? result.data : null;
}
