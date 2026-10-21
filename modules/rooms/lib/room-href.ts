import { blogPath } from "@/lib/host";

export function roomsPath(): string {
  return blogPath("/rooms");
}

export function roomPath(id: number): string {
  return blogPath(`/rooms/${id}`);
}

export function roomSettingsPath(id: number): string {
  return blogPath(`/rooms/${id}/settings`);
}

export function roomJoinPath(code: string): string {
  return blogPath(`/rooms/join/${encodeURIComponent(code)}`);
}
