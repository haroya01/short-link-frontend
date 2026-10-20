import { ApiError, request } from "@/lib/api/client";
import { listFollowers, listFollowing } from "@/modules/blog/api/follows";
import { searchPeople } from "@/modules/blog/api/people";
import type { NoteFeed } from "@/modules/notes/api/notes";

const roomMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const ROOM_MAX_PINNED = 5;
export const ROOM_MAX_PICKED = 20;
export const ROOM_MAX_NAME = 40;

export interface RoomPerson {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export type RoomRole = "OWNER" | "MEMBER";

export interface RoomListItem {
  id: number;
  name: string;
  memberCount: number;
  role: RoomRole;
  hiddenFromFeed: boolean;
  pinned: boolean;
  unreadCount: number;
  lastActivityAt: string | null;
  lastNote: { id: number; excerpt: string | null; author: RoomPerson; createdAt: string | null } | null;
  faces: RoomPerson[];
}

export interface RoomMember extends RoomPerson {
  role: RoomRole;
}

export interface RoomDetail {
  id: number;
  name: string;
  role: RoomRole;
  approvalRequired: boolean;
  hiddenFromFeed: boolean;
  memberCount: number;
  members: RoomMember[];
}

export interface RoomInvite {
  id: number;
  code: string;
  url: string | null;
  pageUrl: string;
  maxUses: number | null;
  uses: number;
  approval: boolean;
  expiresAt: string | null;
  disabled: boolean;
  creator: RoomPerson | null;
}

export interface RoomJoinRequest {
  person: RoomPerson;
  requestedAt: string | null;
}

export interface RoomInvitee {
  person: RoomPerson;
  inviterId: number;
  invitedAt: string | null;
}

export interface RoomInvitation {
  roomId: number;
  roomName: string;
  memberCount: number;
  inviter: RoomPerson;
  approvalRequired: boolean;
  invitedAt: string | null;
}

export type RoomJoinStatus = "joined" | "requested" | "already_member";

export interface RoomJoined {
  status: RoomJoinStatus;
  roomId: number;
}

export type RoomInviteUnusable = "disabled" | "expired" | "used_up" | "full";

/** Backend contract: GET /api/v1/public/room-invites/{code}, public and without notes; 404 for an unknown code. */
export interface RoomInviteLanding {
  roomName: string;
  inviter: RoomPerson | null;
  memberCount: number;
  members: RoomPerson[];
  approval: boolean;
  usable: boolean;
  reason: RoomInviteUnusable | null;
}

export interface RoomInviteOptions {
  maxUses?: number | null;
  expiresInSeconds?: number | null;
  approval?: boolean | null;
}

export type InviteSource = "following" | "followers";

export function roomShareUrl(invite: RoomInvite): string {
  return invite.url ?? invite.pageUrl;
}

export function personName(person: Pick<RoomPerson, "displayName" | "username">): string {
  return person.displayName?.trim() || person.username;
}

const base = "/api/v1/rooms";

export function listMyRooms(): Promise<RoomListItem[]> {
  if (roomMocks) return roomMocks.mockMine();
  return request<RoomListItem[]>(base, { method: "GET" });
}

export function createRoom(name: string): Promise<RoomDetail> {
  if (roomMocks) return roomMocks.mockCreateRoom(name);
  return request<RoomDetail>(base, { method: "POST", body: { name } });
}

export function getRoom(id: number): Promise<RoomDetail> {
  if (roomMocks) return roomMocks.mockDetail(id);
  return request<RoomDetail>(`${base}/${id}`, { method: "GET" });
}

export function renameRoom(id: number, name: string): Promise<RoomDetail> {
  if (roomMocks) return roomMocks.mockRename(id, name);
  return request<RoomDetail>(`${base}/${id}`, { method: "PATCH", body: { name } });
}

export function listRoomNotes(id: number, page = 0): Promise<NoteFeed> {
  if (roomMocks) return roomMocks.mockRoomNotes(id, page);
  return request<NoteFeed>(`${base}/${id}/notes?page=${page}&size=20`, { method: "GET" });
}

export function listRoomsFeed(page = 0, size = 50): Promise<NoteFeed> {
  if (roomMocks) return roomMocks.mockRoomsFeed(page, size);
  return request<NoteFeed>(`${base}/feed?page=${page}&size=${size}`, { method: "GET" });
}

export function markRoomRead(id: number, noteId: number): Promise<unknown> {
  if (roomMocks) return roomMocks.mockRead(id, noteId);
  return request(`${base}/${id}/read`, { method: "POST", body: { noteId } });
}

export async function setRoomHiddenFromFeed(id: number, hidden: boolean): Promise<boolean> {
  if (roomMocks) return roomMocks.mockFeedHidden(id, hidden);
  const result = await request<{ hiddenFromFeed: boolean }>(`${base}/${id}/feed-hidden`, {
    method: hidden ? "PUT" : "DELETE",
  });
  return result.hiddenFromFeed;
}

export async function setRoomPinned(id: number, pinned: boolean): Promise<void> {
  if (roomMocks) return roomMocks.mockPin(id, pinned);
  await request(`${base}/${id}/pin`, { method: pinned ? "PUT" : "DELETE" });
}

export function isPinsFull(error: unknown): boolean {
  return error instanceof ApiError && error.detail.code === "ROOM_PINS_FULL";
}

export async function leaveRoom(id: number, deleteMyNotes: boolean): Promise<void> {
  if (roomMocks) return roomMocks.mockLeave(id);
  await request(`${base}/${id}/leave`, { method: "POST", body: { deleteMyNotes } });
}

export async function removeRoomMember(id: number, memberId: number): Promise<void> {
  if (roomMocks) return roomMocks.mockRemoveMember(id, memberId);
  await request(`${base}/${id}/members/${memberId}`, { method: "DELETE" });
}

export function listRoomInvites(id: number): Promise<RoomInvite[]> {
  if (roomMocks) return roomMocks.mockInvites(id);
  return request<RoomInvite[]>(`${base}/${id}/invites`, { method: "GET" });
}

export function createRoomInvite(id: number, options: RoomInviteOptions = {}): Promise<RoomInvite> {
  if (roomMocks) return roomMocks.mockCreateInvite(id, options);
  return request<RoomInvite>(`${base}/${id}/invites`, { method: "POST", body: options });
}

export function disableRoomInvite(id: number, inviteId: number): Promise<RoomInvite> {
  if (roomMocks) return roomMocks.mockDisableInvite(id, inviteId);
  return request<RoomInvite>(`${base}/${id}/invites/${inviteId}`, { method: "DELETE" });
}

export function listJoinRequests(id: number): Promise<RoomJoinRequest[]> {
  if (roomMocks) return roomMocks.mockRequests(id);
  return request<RoomJoinRequest[]>(`${base}/${id}/requests`, { method: "GET" });
}

export async function answerJoinRequest(id: number, memberId: number, approve: boolean): Promise<void> {
  if (roomMocks) return roomMocks.mockAnswerRequest(id, memberId, approve);
  await request(`${base}/${id}/requests/${memberId}`, approve ? { method: "POST", body: {} } : { method: "DELETE" });
}

export async function listRoomSuggestions(): Promise<RoomPerson[]> {
  if (roomMocks) return roomMocks.mockSuggestions();
  const result = await request<{ friends: RoomPerson[] }>(`${base}/suggestions`, { method: "GET" });
  return result.friends ?? [];
}

export async function dismissRoomSuggestions(userIds: number[]): Promise<void> {
  if (roomMocks) return roomMocks.mockDismissSuggestions(userIds);
  await request(`${base}/suggestions/dismiss`, { method: "POST", body: { userIds } });
}

export function listRoomInvitations(): Promise<RoomInvitation[]> {
  if (roomMocks) return roomMocks.mockInvitations();
  return request<RoomInvitation[]>(`${base}/invitations`, { method: "GET" });
}

export function acceptRoomInvitation(roomId: number): Promise<RoomJoined> {
  if (roomMocks) return roomMocks.mockAnswerInvitation(roomId, true);
  return request<RoomJoined>(`${base}/invitations/${roomId}/accept`, { method: "POST", body: {} });
}

export async function declineRoomInvitation(roomId: number): Promise<void> {
  if (roomMocks) {
    await roomMocks.mockAnswerInvitation(roomId, false);
    return;
  }
  await request(`${base}/invitations/${roomId}/decline`, { method: "POST", body: {} });
}

export function listRoomInvitees(id: number): Promise<RoomInvitee[]> {
  if (roomMocks) return roomMocks.mockInvitees(id);
  return request<RoomInvitee[]>(`${base}/${id}/invitations`, { method: "GET" });
}

export function invitePeople(id: number, userIds: number[]): Promise<RoomInvitee[]> {
  if (roomMocks) return roomMocks.mockInvitePeople(id, userIds);
  return request<RoomInvitee[]>(`${base}/${id}/invitations`, { method: "POST", body: { userIds } });
}

export async function cancelRoomInvitation(id: number, userId: number): Promise<void> {
  if (roomMocks) return roomMocks.mockCancelInvitation(id, userId);
  await request(`${base}/${id}/invitations/${userId}`, { method: "DELETE" });
}

export async function getRoomInviteLanding(code: string): Promise<RoomInviteLanding | null> {
  if (roomMocks) return roomMocks.mockLanding(code);
  try {
    return await request<RoomInviteLanding>(`/api/v1/public/room-invites/${encodeURIComponent(code)}`, {
      method: "GET",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** Errors: 410 ROOM_INVITE_UNUSABLE, 409 ROOM_FULL, 403 ROOM_REMOVED. */
export function joinRoomByInvite(code: string): Promise<RoomJoined> {
  if (roomMocks) return roomMocks.mockJoin(code);
  return request<RoomJoined>(`/api/v1/room-invites/${encodeURIComponent(code)}/join`, { method: "POST", body: {} });
}

export async function listInviteCandidates(source: InviteSource, username: string): Promise<RoomPerson[]> {
  if (roomMocks) return roomMocks.mockCandidates(source);
  const page = source === "following" ? await listFollowing(username, 0, 50) : await listFollowers(username, 0, 50);
  return page.items.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: null,
    avatarUrl: user.avatarUrl,
  }));
}

export async function searchInviteCandidates(query: string): Promise<RoomPerson[]> {
  if (roomMocks) return roomMocks.mockSearchCandidates(query);
  const page = await searchPeople(query);
  return page.items.map((match) => ({
    id: match.userId,
    username: match.username,
    displayName: match.displayName,
    avatarUrl: match.avatarUrl,
  }));
}
