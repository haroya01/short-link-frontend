import { ApiError, mockEmpty } from "@/lib/api/client";
import { readStorageString } from "@/lib/storage-json";
import type { Note, NoteDraft, NoteFeed } from "@/modules/notes/api/notes";
import type {
  InviteSource,
  RoomDetail,
  RoomInvitation,
  RoomInvite,
  RoomInviteLanding,
  RoomInviteOptions,
  RoomInvitee,
  RoomJoinRequest,
  RoomJoined,
  RoomListItem,
  RoomPerson,
} from "./rooms";

type Person = RoomPerson;

interface Room {
  id: number;
  name: string;
  owner: boolean;
  hiddenFromFeed: boolean;
  approval: boolean;
  unread: number;
  members: Person[];
  pinned: boolean;
}

interface Post {
  id: number;
  roomId: number;
  author: Person;
  body: string;
  minutesAgo: number;
  createdAt?: string;
}

const person = (id: number, username: string, displayName: string | null): Person => ({
  id,
  username,
  displayName,
  avatarUrl: null,
});

const ME = { id: 1, username: "dohyun", displayName: null, avatarUrl: "https://i.pravatar.cc/120?img=12" };
const MINJI = person(31, "minji", "민지");
const JUNHO = person(32, "junho", "준호");
const YUKI = person(2, "yuki_dev", null);
const KIM = person(3, "reader_kim", "김독자");
const EUNSEONG = person(33, "eunseong", "은성");
const HANEUL = person(34, "haneul", "하늘");
const NARAE = person(35, "narae", "나래");
const SORA = person(36, "sora", "소라");
const HANBIT = person(37, "hanbit", null);
const MOM = person(40, "mom_kim", "엄마");
const SISTER = person(41, "seoyeon", "서연");

const FOLLOWING: Person[] = [MINJI, JUNHO, YUKI, KIM, HANEUL, SORA];
const FOLLOWERS: Person[] = [MINJI, JUNHO, EUNSEONG, NARAE, KIM];
const KNOWN: Person[] = [...FOLLOWING, ...FOLLOWERS, HANBIT, MOM, SISTER];

const emptyScene = () => mockEmpty("rooms");

function room(partial: Omit<Room, "pinned" | "approval" | "hiddenFromFeed" | "unread"> & Partial<Room>): Room {
  return { pinned: false, approval: false, hiddenFromFeed: false, unread: 0, ...partial };
}

function seedRooms(): Room[] {
  if (emptyScene()) return [];
  return [
    room({ id: 1, name: "동아리 사람들", owner: true, unread: 3, members: [ME, MINJI, JUNHO, YUKI] }),
    room({ id: 2, name: "대학 동기", owner: false, members: [KIM, ME, MINJI] }),
    room({ id: 3, name: "헥사고날 스터디", owner: false, hiddenFromFeed: true, approval: true, members: [YUKI, ME, KIM, JUNHO] }),
    room({ id: 5, name: "우리 가족", owner: true, hiddenFromFeed: true, pinned: true, members: [ME, MOM, SISTER] }),
    room({ id: 6, name: "제주 여행 2024", owner: false, members: [MINJI, ME, HANEUL, SORA] }),
  ];
}

const POSTS: Post[] = [
  { id: 9901, roomId: 1, author: MINJI, body: "내일 몇 시에 봐? 저녁 먹고 가도 될 듯", minutesAgo: 3 },
  { id: 9902, roomId: 1, author: JUNHO, body: "7시 어때. 역 앞 카페에서 모이자", minutesAgo: 9 },
  { id: 9903, roomId: 1, author: YUKI, body: "지난주 사진 정리해서 올릴게요", minutesAgo: 52 },
  { id: 9904, roomId: 2, author: KIM, body: "졸업 앨범 사진 받았어? 단체 사진 하나 더 있대", minutesAgo: 60 * 20 },
  { id: 9906, roomId: 2, author: MINJI, body: "다음 달에 동기 모임 한번 하자. 날짜 몇 개 올려볼게", minutesAgo: 60 * 3 },
  { id: 9907, roomId: 1, author: ME, body: "다들 7시 괜찮으면 거기서 봐요", minutesAgo: 60 * 6 },
  { id: 9908, roomId: 1, author: JUNHO, body: "어제 찍은 사진 다들 받았지? 단체 사진은 내가 보정해서 다시 올릴게", minutesAgo: 60 * 27 },
  { id: 9909, roomId: 5, author: MOM, body: "주말에 김치 보낼게. 받으면 꼭 연락하고 밥 잘 챙겨 먹어", minutesAgo: 60 * 24 * 12 },
  { id: 9910, roomId: 6, author: HANEUL, body: "사진 앨범 링크 다시 올려요. 다들 받아 가세요", minutesAgo: 60 * 24 * 40 },
  { id: 9905, roomId: 3, author: YUKI, body: "다음 주는 포트·어댑터 이름 짓기 정리해 올게요", minutesAgo: 60 * 24 * 5 },
];

const LONG_ROOM_ID = 1;

function seedReceived(): { room: Room; inviter: Person }[] {
  if (emptyScene()) return [];
  return [
    {
      room: room({ id: 4, name: "주말 등산 모임", owner: false, members: [YUKI, HANEUL, SORA] }),
      inviter: YUKI,
    },
  ];
}

interface Landing {
  roomId: number;
  inviter: Person;
  approval: boolean;
  reason: RoomInviteLanding["reason"];
}

const LANDINGS: Record<string, Landing> = {
  hike: { roomId: 4, inviter: YUKI, approval: false, reason: null },
  study: { roomId: 4, inviter: YUKI, approval: true, reason: null },
  old: { roomId: 4, inviter: YUKI, approval: false, reason: "expired" },
  off: { roomId: 4, inviter: YUKI, approval: false, reason: "disabled" },
  spent: { roomId: 4, inviter: YUKI, approval: false, reason: "used_up" },
  packed: { roomId: 4, inviter: YUKI, approval: false, reason: "full" },
};

let rooms: Room[] | null = null;
let posts: Post[] = [...POSTS];
let received: { room: Room; inviter: Person }[] | null = null;
let suggested: Person[] | null = null;
let invites: Record<number, RoomInvite[]> = {};
let requests: Record<number, Person[]> = { 1: [EUNSEONG] };
let invitees: Record<number, { person: Person; inviter: number }[]> = { 1: [{ person: KIM, inviter: ME.id }] };
let nextRoomId = 10;
let nextInviteId = 100;
let nextNoteId = 99_500;

function state(): Room[] {
  rooms ??= seedRooms();
  return rooms;
}

function invitationsState() {
  received ??= seedReceived();
  return received;
}

function suggestedState(): Person[] {
  suggested ??= emptyScene() ? [] : [MINJI, JUNHO];
  return suggested;
}

function knownRoom(id: number): Room | undefined {
  return state().find((r) => r.id === id) ?? invitationsState().find((r) => r.room.id === id)?.room;
}

function find(id: number): Room {
  const found = state().find((r) => r.id === id);
  if (!found) throw new ApiError(404, { status: 404, code: "ROOM_NOT_FOUND" });
  return found;
}

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const postedAt = (post: Post) => post.createdAt ?? iso(post.minutesAgo);
const newestFirst = (a: Post, b: Post) => postedAt(b).localeCompare(postedAt(a));

function noteOf(post: Post): Note {
  return {
    id: post.id,
    body: post.body,
    createdAt: postedAt(post),
    editedAt: null,
    likeCount: post.author.id === ME.id ? 0 : null,
    likedByMe: false,
    author: { id: post.author.id, username: post.author.username, displayName: post.author.displayName, avatarUrl: post.author.avatarUrl },
    media: [],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    repostCount: null,
    repostedByMe: false,
    quotedNote: null,
    linkPreview: null,
    bookmarkedByMe: false,
    conversationMuted: false,
    mentions: [],
    contentWarning: null,
    sensitive: false,
    pinned: false,
    visibility: "room",
    poll: null,
    replyPolicy: "everyone",
    canReply: true,
    room: { id: post.roomId, name: knownRoom(post.roomId)?.name ?? "" },
  };
}

function longRoomPosts(): Post[] {
  if (readStorageString("kurl:mock-room-long") !== "1") return [];
  return Array.from({ length: 36 }, (_, i) => ({
    id: 9700 + i,
    roomId: LONG_ROOM_ID,
    author: [MINJI, JUNHO, YUKI][i % 3],
    body: `지난 이야기 ${i + 1}`,
    minutesAgo: 60 * 24 * 2 + i * 60 * 5,
  }));
}

function roomPosts(id: number): Post[] {
  return [...posts, ...(id === LONG_ROOM_ID ? longRoomPosts() : [])].filter((p) => p.roomId === id).sort(newestFirst);
}

function listItem(r: Room): RoomListItem {
  const last = roomPosts(r.id)[0];
  return {
    id: r.id,
    name: r.name,
    memberCount: r.members.length,
    role: r.owner ? "OWNER" : "MEMBER",
    hiddenFromFeed: r.hiddenFromFeed,
    pinned: r.pinned,
    unreadCount: r.unread,
    faces: r.members.filter((m) => m.id !== ME.id).slice(0, 4),
    lastActivityAt: last ? postedAt(last) : null,
    lastNote: last ? { id: last.id, excerpt: last.body, author: last.author, createdAt: postedAt(last) } : null,
  };
}

function detail(r: Room): RoomDetail {
  return {
    id: r.id,
    name: r.name,
    role: r.owner ? "OWNER" : "MEMBER",
    approvalRequired: r.approval,
    hiddenFromFeed: r.hiddenFromFeed,
    memberCount: r.members.length,
    members: r.members.map((m, index) => ({ ...m, role: index === 0 ? "OWNER" : "MEMBER" })),
  };
}

const done = <T>(value: T) => Promise.resolve(value);

export function mockMine(): Promise<RoomListItem[]> {
  return done(state().map(listItem));
}

export function mockCreateRoom(name: string): Promise<RoomDetail> {
  const created = room({ id: nextRoomId++, name: name.trim(), owner: true, members: [ME] });
  state().unshift(created);
  return done(detail(created));
}

export function mockDetail(id: number): Promise<RoomDetail> {
  try {
    return done(detail(find(id)));
  } catch (error) {
    return Promise.reject(error);
  }
}

export function mockRename(id: number, name: string): Promise<RoomDetail> {
  const r = find(id);
  r.name = name.trim();
  return done(detail(r));
}

const PAGE = 20;

export function mockRoomNotes(id: number, page: number): Promise<NoteFeed> {
  if (!state().some((r) => r.id === id)) {
    return Promise.reject(new ApiError(404, { status: 404, code: "NOTE_ROOM_NOT_FOUND" }));
  }
  const all = roomPosts(id);
  return done({
    items: all.slice(page * PAGE, page * PAGE + PAGE).map(noteOf),
    page,
    hasNext: all.length > (page + 1) * PAGE,
  });
}

export function mockRoomsFeed(page: number, size: number): Promise<NoteFeed> {
  const mine = new Set(state().map((r) => r.id));
  const all = [...posts].filter((p) => mine.has(p.roomId)).sort(newestFirst);
  return done({ items: all.slice(page * size, page * size + size).map(noteOf), page, hasNext: all.length > (page + 1) * size });
}

export function mockFollowingRoomNotes(): Note[] {
  if (readStorageString("kurl:mock-home-rooms") !== "1") return [];
  const shown = new Set(state().filter((r) => !r.hiddenFromFeed).map((r) => r.id));
  return [...posts].filter((p) => shown.has(p.roomId)).sort(newestFirst).slice(0, 2).map(noteOf);
}

export function mockRead(id: number): Promise<unknown> {
  find(id).unread = 0;
  return done({ unreadCount: 0 });
}

export function mockFeedHidden(id: number, hidden: boolean): Promise<boolean> {
  find(id).hiddenFromFeed = hidden;
  return done(hidden);
}

export function mockPin(id: number, pinned: boolean): Promise<void> {
  const all = state();
  if (pinned && all.filter((r) => r.pinned).length >= 5) {
    return Promise.reject(new ApiError(409, { status: 409, code: "ROOM_PINS_FULL" }));
  }
  find(id).pinned = pinned;
  return done(undefined);
}

export function mockLeave(id: number): Promise<void> {
  rooms = state().filter((r) => r.id !== id);
  return done(undefined);
}

export function mockRemoveMember(id: number, memberId: number): Promise<void> {
  const r = find(id);
  r.members = r.members.filter((m) => m.id !== memberId);
  return done(undefined);
}

export function mockInvites(id: number): Promise<RoomInvite[]> {
  return done(invites[id] ?? []);
}

export function mockCreateInvite(id: number, options: RoomInviteOptions): Promise<RoomInvite> {
  const r = find(id);
  const inviteId = nextInviteId++;
  const code = `r${inviteId}x`;
  const invite: RoomInvite = {
    id: inviteId,
    code,
    url: `https://kurl.me/R${inviteId}k`,
    pageUrl: `https://kurl.me/rooms/join/${code}`,
    maxUses: options.maxUses ?? null,
    uses: 0,
    approval: options.approval ?? r.approval,
    expiresAt: options.expiresInSeconds ? new Date(Date.now() + options.expiresInSeconds * 1000).toISOString() : null,
    disabled: false,
    creator: ME,
  };
  invites = { ...invites, [id]: [invite, ...(invites[id] ?? [])] };
  return done(invite);
}

export function mockDisableInvite(id: number, inviteId: number): Promise<RoomInvite> {
  const list = (invites[id] ?? []).map((invite) => (invite.id === inviteId ? { ...invite, disabled: true } : invite));
  invites = { ...invites, [id]: list };
  return done(list.find((invite) => invite.id === inviteId)!);
}

export function mockRequests(id: number): Promise<RoomJoinRequest[]> {
  return done((requests[id] ?? []).map((who) => ({ person: who, requestedAt: iso(30) })));
}

export function mockAnswerRequest(id: number, memberId: number, approve: boolean): Promise<void> {
  const who = (requests[id] ?? []).find((p) => p.id === memberId);
  if (approve && who) find(id).members.push(who);
  requests = { ...requests, [id]: (requests[id] ?? []).filter((p) => p.id !== memberId) };
  return done(undefined);
}

export function mockSuggestions(): Promise<Person[]> {
  return done([...suggestedState()]);
}

export function mockDismissSuggestions(userIds: number[]): Promise<void> {
  suggested = suggestedState().filter((p) => !userIds.includes(p.id));
  return done(undefined);
}

export function mockInvitations(): Promise<RoomInvitation[]> {
  return done(
    invitationsState().map(({ room: r, inviter }) => ({
      roomId: r.id,
      roomName: r.name,
      memberCount: r.members.length,
      inviter,
      approvalRequired: r.approval,
      invitedAt: iso(40),
    })),
  );
}

export function mockAnswerInvitation(roomId: number, accept: boolean): Promise<RoomJoined> {
  const list = invitationsState();
  const at = list.findIndex((entry) => entry.room.id === roomId);
  if (at < 0) return Promise.reject(new ApiError(404, { status: 404, code: "ROOM_INVITATION_NOT_FOUND" }));
  const [{ room: r }] = list.splice(at, 1);
  if (!accept) return done({ status: "joined", roomId });
  if (r.approval) return done({ status: "requested", roomId });
  r.members.push(ME);
  state().unshift(r);
  return done({ status: "joined", roomId });
}

function inviteeViews(id: number): RoomInvitee[] {
  return (invitees[id] ?? []).map(({ person: who, inviter }) => ({ person: who, inviterId: inviter, invitedAt: iso(10) }));
}

export function mockInvitees(id: number): Promise<RoomInvitee[]> {
  return done(inviteeViews(id));
}

export function mockInvitePeople(id: number, userIds: number[]): Promise<RoomInvitee[]> {
  const r = find(id);
  const waiting = invitees[id] ?? [];
  const added = userIds
    .filter((uid) => !r.members.some((m) => m.id === uid) && !waiting.some((w) => w.person.id === uid))
    .flatMap((uid) => {
      const who = KNOWN.find((p) => p.id === uid);
      return who ? [{ person: who, inviter: ME.id }] : [];
    });
  invitees = { ...invitees, [id]: [...added, ...waiting] };
  return done(inviteeViews(id));
}

export function mockCancelInvitation(id: number, userId: number): Promise<void> {
  invitees = { ...invitees, [id]: (invitees[id] ?? []).filter((w) => w.person.id !== userId) };
  return done(undefined);
}

export function mockCandidates(source: InviteSource): Promise<Person[]> {
  return done(source === "following" ? FOLLOWING : FOLLOWERS);
}

export function mockSearchCandidates(query: string): Promise<Person[]> {
  const needle = query.trim().replace(/^@/, "").toLowerCase();
  const unique = [...new Map([...KNOWN, NARAE, EUNSEONG].map((p) => [p.id, p])).values()];
  return done(
    unique.filter((p) => p.username.toLowerCase().startsWith(needle) || (p.displayName ?? "").toLowerCase().includes(needle)),
  );
}

export function mockLanding(code: string): Promise<RoomInviteLanding | null> {
  const landing = LANDINGS[code];
  if (!landing) return done(null);
  const r = knownRoom(landing.roomId) ?? seedReceived()[0]?.room ?? room({ id: 4, name: "주말 등산 모임", owner: false, members: [YUKI, HANEUL, SORA] });
  return done({
    roomName: r.name,
    inviter: landing.inviter,
    memberCount: r.members.length,
    members: r.members.slice(0, 8),
    approval: landing.approval || r.approval,
    usable: landing.reason === null,
    reason: landing.reason,
  });
}

export function mockJoin(code: string): Promise<RoomJoined> {
  const landing = LANDINGS[code];
  if (!landing) return Promise.reject(new ApiError(404, { status: 404, code: "ROOM_INVITE_NOT_FOUND" }));
  if (landing.reason) return Promise.reject(new ApiError(410, { status: 410, code: "ROOM_INVITE_UNUSABLE" }));
  if (state().some((r) => r.id === landing.roomId)) return done({ status: "already_member", roomId: landing.roomId });
  if (landing.approval) return done({ status: "requested", roomId: landing.roomId });
  const list = invitationsState();
  const at = list.findIndex((entry) => entry.room.id === landing.roomId);
  const r = at >= 0 ? list.splice(at, 1)[0].room : room({ id: landing.roomId, name: "주말 등산 모임", owner: false, members: [YUKI, HANEUL, SORA] });
  r.members.push(ME);
  state().unshift(r);
  return done({ status: "joined", roomId: r.id });
}

export function mockPostInRoom(draft: NoteDraft): Promise<Note> {
  const roomId = draft.roomId!;
  find(roomId);
  const post: Post = { id: nextNoteId++, roomId, author: ME, body: draft.body.trim(), minutesAgo: 0, createdAt: new Date().toISOString() };
  posts = [post, ...posts];
  return done(noteOf(post));
}
