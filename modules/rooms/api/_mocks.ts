import { ApiError, mockEmpty } from "@/lib/api/client";
import { readStorageString } from "@/lib/storage-json";
import type { HomePost } from "@/modules/blog/api/home-feed";
import type { Note, NoteDraft, NoteFeed } from "@/modules/notes/api/notes";
import type {
  InviteSource,
  RoomDetail,
  RoomInvitation,
  RoomInvite,
  RoomInviteLanding,
  RoomInviteOptions,
  RoomInvitee,
  RoomItem,
  RoomItemsPage,
  RoomJoinRequest,
  RoomReply,
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
  { id: 9910, roomId: 1, author: MINJI, body: "퇴근하다 한강 들름 바람 미쳤음", minutesAgo: 3 },
  { id: 9909, roomId: 1, author: JUNHO, body: "5키로 첨으로 안 쉬고 뛰었다 ㅋㅋ", minutesAgo: 9 },
  { id: 9908, roomId: 1, author: YUKI, body: "엠티 사진 정리중인데 왜케 많냐", minutesAgo: 52 },
  { id: 9905, roomId: 2, author: KIM, body: "졸업앨범 받음 우리과 페이지 개웃김", minutesAgo: 60 * 20 },
  { id: 9907, roomId: 2, author: MINJI, body: "퇴근하고 공방 다니는데 첫 컵 망함 ㅠ", minutesAgo: 60 * 3 },
  { id: 9906, roomId: 1, author: ME, body: "필카 첫 롤 현상 맡김", minutesAgo: 60 * 6 },
  { id: 9904, roomId: 1, author: JUNHO, body: "어제 단체사진 보정 끝 표정 다 제각각 ㅋㅋ", minutesAgo: 60 * 27 },
  { id: 9902, roomId: 5, author: MOM, body: "김장 끝 허리 나감", minutesAgo: 60 * 24 * 12 },
  { id: 9901, roomId: 6, author: HANEUL, body: "앨범 정리하다 옛날 사진 나옴 다들 애기네", minutesAgo: 60 * 24 * 40 },
  { id: 9903, roomId: 3, author: YUKI, body: "포트 어댑터 이름 짓다가 한시간 날림", minutesAgo: 60 * 24 * 5 },
];

const LONG_ROOM_ID = 1;

interface BlogPost {
  id: number;
  roomId: number;
  author: Person;
  slug: string;
  title: string;
  excerpt: string;
  minutesAgo: number;
  cover: string | null;
  readMinutes: number;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 8801,
    roomId: 1,
    author: YUKI,
    slug: "rainy-mt-night",
    title: "비 오던 엠티의 밤",
    excerpt: "펜션 지붕을 두드리던 빗소리, 새벽 세 시까지 이어진 보드게임, 그리고 아무도 제대로 못 찍은 단체 사진 이야기.",
    minutesAgo: 30,
    cover: "https://picsum.photos/seed/kurlmt/1200/675",
    readMinutes: 4,
  },
  {
    id: 8802,
    roomId: 2,
    author: KIM,
    slug: "graduation-album",
    title: "졸업 앨범을 받은 날",
    excerpt: "4년 동안 찍힌 내 얼굴은 생각보다 적었다. 대신 뒷모습이 자주 나왔다.",
    minutesAgo: 60 * 5,
    cover: "https://picsum.photos/seed/kurlgrad/1200/675",
    readMinutes: 3,
  },
  {
    id: 8803,
    roomId: 5,
    author: SISTER,
    slug: "moms-kimchi",
    title: "엄마 김치 레시피 받아 적기",
    excerpt: "\"적당히\"를 숫자로 바꾸는 데 전화 세 통이 걸렸다.",
    minutesAgo: 60 * 24 * 2,
    cover: null,
    readMinutes: 6,
  },
];

const REPLIES: Record<string, [number, Person, string][]> = {
  "note-9910": [
    [9951, JUNHO, "나도 어제 거기 있었는데"],
    [9952, YUKI, "사진 있으면 올려 줘요"],
  ],
  "note-9909": [[9953, MINJI, "오 ㄷㄷ 다음엔 같이 뛰자"]],
  "post-8801": [
    [9954, MINJI, "단체 사진 진짜 한 장도 없는 거 실화냐"],
    [9955, JUNHO, "보드게임 진 사람 누구였지"],
    [9956, ME, "나야… 다음엔 이긴다"],
  ],
  "post-8803": [[9957, MOM, "적당히가 제일 정확한 건데"]],
};

function replyViews(key: string): RoomReply[] {
  return (REPLIES[key] ?? []).slice(0, 2).map(([id, who, body]) => ({
    id,
    author: { id: who.id, username: who.username, displayName: who.displayName, avatarUrl: who.avatarUrl },
    body,
  }));
}

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
    replyCount: REPLIES[`note-${post.id}`]?.length ?? 0,
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

export function mockFollowingRoomNotes(): Note[] {
  if (readStorageString("kurl:mock-home-rooms") !== "1") return [];
  const shown = new Set(state().filter((r) => !r.hiddenFromFeed).map((r) => r.id));
  return [...posts].filter((p) => shown.has(p.roomId)).sort(newestFirst).slice(0, 2).map(noteOf);
}

export function mockRead(id: number, noteId: number): Promise<unknown> {
  const r = find(id);
  const all = roomPosts(id);
  const upTo = all.find((p) => p.id === noteId);
  const newer = upTo ? all.filter((p) => postedAt(p) > postedAt(upTo)).length : r.unread;
  r.unread = Math.min(r.unread, newer);
  return done({ unreadCount: r.unread });
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

function blogPostView(post: BlogPost): HomePost {
  return {
    id: post.id,
    author: { id: post.author.id, username: post.author.username, displayName: post.author.displayName, avatarUrl: post.author.avatarUrl, bio: null },
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    ogImageUrl: post.cover,
    thumbnailUrl: post.cover,
    languageTag: "ko",
    tags: [],
    publishedAt: iso(post.minutesAgo),
    viewCount: 4,
    likeCount: 2,
    readMinutes: post.readMinutes,
    commentCount: REPLIES[`post-${post.id}`]?.length ?? 0,
    likedByMe: false,
    audience: "ROOM",
    room: { id: post.roomId, name: knownRoom(post.roomId)?.name ?? "" },
  } as HomePost;
}

function mixed(roomIds: Set<number>, withLong: boolean): RoomItem[] {
  const notes = [...posts, ...(withLong ? longRoomPosts() : [])]
    .filter((p) => roomIds.has(p.roomId))
    .map((p): [string, RoomItem] => [postedAt(p), { kind: "note", note: noteOf(p), replies: replyViews(`note-${p.id}`) }]);
  const blog = BLOG_POSTS.filter((b) => roomIds.has(b.roomId)).map((b): [string, RoomItem] => [
    iso(b.minutesAgo),
    { kind: "post", post: blogPostView(b), replies: replyViews(`post-${b.id}`) },
  ]);
  return [...notes, ...blog].sort((a, b) => b[0].localeCompare(a[0])).map(([, item]) => item);
}

function paged(all: RoomItem[], cursor: string | null, limit: number): RoomItemsPage {
  const start = cursor ? Number(cursor.split(".")[0]) || 0 : 0;
  const end = start + limit;
  return { items: all.slice(start, end), next: end < all.length ? `${end}.0` : null };
}

export function mockRoomItems(id: number, cursor: string | null, limit: number): Promise<RoomItemsPage> {
  if (!state().some((r) => r.id === id)) {
    return Promise.reject(new ApiError(404, { status: 404, code: "NOTE_ROOM_NOT_FOUND" }));
  }
  return done(paged(mixed(new Set([id]), id === LONG_ROOM_ID), cursor, limit));
}

export function mockAllRoomItems(cursor: string | null, limit: number): Promise<RoomItemsPage> {
  return done(paged(mixed(new Set(state().map((r) => r.id)), true), cursor, limit));
}

export function mockFollowingRoomPosts(): HomePost[] {
  if (readStorageString("kurl:mock-home-rooms") !== "1") return [];
  const shown = new Set(state().filter((r) => !r.hiddenFromFeed).map((r) => r.id));
  return BLOG_POSTS.filter((b) => shown.has(b.roomId)).slice(0, 1).map(blogPostView);
}

export function mockRoomNames(): Record<number, string> {
  return Object.fromEntries(state().map((r) => [r.id, r.name]));
}
