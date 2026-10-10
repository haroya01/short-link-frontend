import { request } from "@/lib/api/client";
import { stripImageMetadata } from "@/lib/image-resize";
import {
  fetchPublic,
  type FetchResult,
  type PublicFeedView,
  type SeriesItemLink,
} from "@/modules/blog/api/public-posts";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
// 목 노트는 목 빌드에서만 싣는다 — 조건이 빌드 상수로 접히면 require 가 번들에서 빠진다.
const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const NOTE_MAX_LENGTH = 500;
/** A thread posts 2 to this many notes at once (the server's limit). */
export const NOTE_MAX_THREAD_NOTES = 10;
export const NOTE_MAX_IMAGES = 4;
export const NOTE_ALT_MAX_LENGTH = 1500;
export const NOTE_POLL_MAX_OPTIONS = 4;
export const NOTE_POLL_OPTION_MAX_LENGTH = 50;

export interface NoteAuthor {
  id: number;
  username: string;
  avatarUrl: string | null;
  displayName?: string | null;
  /** Set for an account on another server: username is then user@server and id is negative. */
  remoteId?: number | null;
  url?: string | null;
}

export interface NoteMedia {
  url: string;
  altText: string | null;
  contentType: string;
  /** The original size when the server knows it — lets the picture hold its shape before it loads. */
  width?: number | null;
  height?: number | null;
}

export interface QuotedPost {
  id: number;
  title: string;
  slug: string;
  authorUsername: string;
}

export interface NoteLinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface QuotedNote {
  id: number;
  body: string;
  createdAt: string;
  author: NoteAuthor;
  media: NoteMedia[];
  contentWarning?: string | null;
  sensitive?: boolean;
}

/** `likeCount` and `repostCount` are the author's own numbers and null for everyone else (counts are
 *  not public). `likedByMe` and `repostedByMe` are null for anonymous readers. */
export interface Note {
  id: number;
  body: string;
  createdAt: string;
  editedAt: string | null;
  likeCount: number | null;
  likedByMe: boolean | null;
  author: NoteAuthor;
  media: NoteMedia[];
  quotedPost: QuotedPost | null;
  inReplyToId: number | null;
  replyCount: number;
  repostCount: number | null;
  repostedByMe: boolean | null;
  quotedNote: QuotedNote | null;
  /** Open Graph card for the body's first link, fetched by the server after posting. */
  linkPreview: NoteLinkPreview | null;
  /** Set in the following feed when the note came in through someone's repost. */
  repostedBy?: NoteAuthor | null;
  quoteCount?: number;
  /** Only the reader's own; null for anonymous readers. */
  bookmarkedByMe?: boolean | null;
  /** The reader turned off this note's conversation (Mastodon's mute conversation); null when anonymous. */
  conversationMuted?: boolean | null;
  /** Members the body mentions who exist — only these handles link to a profile. */
  mentions?: string[];
  /** Mastodon's content warning: the body, photos and cards fold behind it until the reader opens it. */
  contentWarning?: string | null;
  /** Photos are covered until tapped. Always on when there is a warning. */
  sensitive?: boolean;
  /** The author pinned it to the top of their profile (at most five, as on Mastodon). */
  pinned?: boolean;
  visibility?: NoteVisibility;
  poll?: NotePoll | null;
  /** ISO 639-1 as the writer chose it; null when unknown (older notes, other servers that did not say). */
  language?: string | null;
  /** In a feed: the author went on in their own replies — how many parts, and the next one to show. */
  thread?: NoteSelfThread | null;
}

/** Mastodon's poll. Counts are public; the author gets `voted: true` and only sees results.
 *  `voted` and `ownVotes` are null for anonymous readers. */
export interface NotePoll {
  expiresAt: string;
  expired: boolean;
  multiple: boolean;
  votesCount: number;
  votersCount: number;
  options: { title: string; votesCount: number }[];
  voted: boolean | null;
  ownVotes: number[] | null;
}

export interface NotePollDraft {
  options: string[];
  expiresIn: number;
  multiple: boolean;
}

export interface NoteFeed {
  items: Note[];
  page: number;
  hasNext: boolean;
}

export interface NoteSelfThread {
  total: number;
  preview: Note[];
}

export interface NoteThread {
  note: Note;
  parent: Note | null;
  replies: Note[];
  /** The author's own parts under the note, in order; replies are everyone else's. */
  continuation?: Note[];
  /** The note author's series this note sits in, counted across its posts and notes. */
  series?: NoteSeriesNav | null;
}

export interface NoteSeriesNav {
  slug: string;
  title: string;
  position: number;
  total: number;
  prev: SeriesItemLink | null;
  next: SeriesItemLink | null;
}

export interface NoteDraftImage {
  key: string;
  altText: string;
  width?: number | null;
  height?: number | null;
}

export interface NoteDraft {
  body: string;
  images: NoteDraftImage[];
  quotedPostId: number | null;
  inReplyToId: number | null;
  quotedNoteId: number | null;
  contentWarning?: string | null;
  sensitive?: boolean;
  /** Omitted on a reply: the server keeps the parent's visibility, as Mastodon does. */
  visibility?: NoteVisibility | null;
  poll?: NotePollDraft | null;
  language?: string | null;
}

export const NOTE_MAX_WARNING_LENGTH = 100;

/** Mastodon's four: public everywhere; unlisted stays out of the shared feeds; private is for
 *  followers and mentioned members; direct only for mentioned members. Only the first two can be
 *  reposted or quoted. */
export type NoteVisibility = "public" | "unlisted" | "private" | "direct";

export function isShareable(visibility: NoteVisibility | undefined): boolean {
  return visibility === undefined || visibility === "public" || visibility === "unlisted";
}

export interface FederationSettings {
  enabled: boolean;
  noticeSeen: boolean;
  handle: string | null;
}

interface PresignedNoteImage {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  maxBytes: number;
}

export type NoteImageErrorCode = "not-image" | "too-large" | "upload-failed";

export class NoteImageUploadError extends Error {
  constructor(readonly code: NoteImageErrorCode) {
    super(code);
    this.name = "NoteImageUploadError";
  }
}

export function listEveryoneNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockEveryoneNotes(page));
  return request<NoteFeed>(`/api/v1/public/notes?page=${page}&size=20`, { method: "GET" });
}

export function listTrendingNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockTrendingNotes(page));
  return request<NoteFeed>(`/api/v1/public/notes?sort=trending&page=${page}&size=20`, {
    method: "GET",
  });
}

/** Mastodon's live feed of other servers: public notes this server received, for members. */
export function listFederatedNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockFederatedNotes(page));
  return request<NoteFeed>(`/api/v1/notes/federated?page=${page}&size=20`, { method: "GET" });
}

/** Mastodon's trending hashtags: tags several accounts used this week, notes per day oldest first. */
export interface TrendingNoteTag {
  tag: string;
  accounts: number;
  uses: number;
  history: number[];
}

export function listTrendingNoteTags(): Promise<TrendingNoteTag[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockTrendingNoteTags());
  return request<TrendingNoteTag[]>("/api/v1/public/notes/trending-tags", { method: "GET" });
}

export interface TrendingNoteLink {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  accounts: number;
  uses: number;
  history: number[];
}

export function listTrendingNoteLinks(): Promise<TrendingNoteLink[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockTrendingNoteLinks());
  return request<TrendingNoteLink[]>("/api/v1/public/notes/trending-links", { method: "GET" });
}

export function listLinkedNotes(url: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockLinkedNotes(url, page));
  return request<NoteFeed>(
    `/api/v1/public/notes/links?url=${encodeURIComponent(url)}&page=${page}&size=20`,
    { method: "GET" },
  );
}

export function listFollowingNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockFollowingNotes(page));
  return request<NoteFeed>(`/api/v1/notes/following?page=${page}&size=20`, { method: "GET" });
}

export function listTaggedNotes(tag: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockTaggedNotes(tag, page));
  return request<NoteFeed>(
    `/api/v1/public/notes/tags/${encodeURIComponent(tag)}?page=${page}&size=20`,
    { method: "GET" },
  );
}

export interface RemoteAccount {
  id: number;
  acct: string;
  username: string;
  domain: string;
  displayName: string | null;
  avatarUrl: string | null;
  url: string;
  /** Their server accepted the follow. */
  following: boolean;
  /** A follow was sent and their server has not answered yet. */
  requested: boolean;
  /** The viewer blocked this account's whole server. */
  domainBlocked?: boolean;
}

export interface DomainBlock {
  domain: string;
  createdAt: string | null;
}

export function lookupRemoteAccount(acct: string): Promise<RemoteAccount> {
  if (noteMocks) return noteMocks.mockLookupRemote(acct.trim());
  return request<RemoteAccount>(
    `/api/v1/federation/accounts/lookup?acct=${encodeURIComponent(acct.trim())}`,
    { method: "GET" },
  );
}

export function getRemoteAccount(id: number): Promise<RemoteAccount> {
  if (noteMocks) return noteMocks.mockRemoteAccount(id);
  return request<RemoteAccount>(`/api/v1/federation/accounts/${id}`, { method: "GET" });
}

export function setRemoteFollow(id: number, on: boolean): Promise<RemoteAccount> {
  if (noteMocks) return noteMocks.mockSetRemoteFollow(id, on);
  return request<RemoteAccount>(`/api/v1/federation/accounts/${id}/follow`, {
    method: on ? "POST" : "DELETE",
  });
}

export function listRemoteFollowing(page = 0): Promise<RemoteAccount[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockRemoteFollowing());
  return request<RemoteAccount[]>(`/api/v1/federation/following?page=${page}&size=50`, {
    method: "GET",
  });
}

export function listDomainBlocks(): Promise<DomainBlock[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockDomainBlocks());
  return request<DomainBlock[]>("/api/v1/federation/domain-blocks", { method: "GET" });
}

/** Mastodon's domain block: follows there end, followers there go, its notes and notices stay out. */
export async function setDomainBlocked(domain: string, on: boolean): Promise<void> {
  if (noteMocks) return noteMocks.mockSetDomainBlocked(domain, on);
  await request<unknown>(`/api/v1/federation/domain-blocks/${encodeURIComponent(domain)}`, {
    method: on ? "PUT" : "DELETE",
  });
}

export function listRemoteAccountNotes(id: number, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockRemoteAccountNotes(id, page));
  return request<NoteFeed>(`/api/v1/federation/accounts/${id}/notes?page=${page}&size=20`, {
    method: "GET",
  });
}

export function searchNotes(query: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSearchNotes(query, page));
  return request<NoteFeed>(
    `/api/v1/public/notes/search?q=${encodeURIComponent(query)}&page=${page}&size=20`,
    { method: "GET" },
  );
}

export interface NoteListSummary {
  id: number;
  title: string;
  memberCount: number;
}

export function listNoteLists(): Promise<NoteListSummary[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockLists());
  return request<NoteListSummary[]>("/api/v1/notes/lists", { method: "GET" });
}

export function createNoteList(title: string): Promise<NoteListSummary> {
  if (noteMocks) return Promise.resolve(noteMocks.mockCreateList(title));
  return request<NoteListSummary>("/api/v1/notes/lists", { method: "POST", body: { title } });
}

export function renameNoteList(id: number, title: string): Promise<NoteListSummary> {
  if (noteMocks) return Promise.resolve(noteMocks.mockRenameList(id, title));
  return request<NoteListSummary>(`/api/v1/notes/lists/${id}`, { method: "PATCH", body: { title } });
}

export function deleteNoteList(id: number): Promise<void> {
  if (noteMocks) return Promise.resolve(noteMocks.mockDeleteList(id));
  return request<void>(`/api/v1/notes/lists/${id}`, { method: "DELETE" });
}

export function listNoteListMembers(id: number): Promise<NoteAuthor[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockListMembers(id));
  return request<NoteAuthor[]>(`/api/v1/notes/lists/${id}/members`, { method: "GET" });
}

export function setNoteListMember(id: number, username: string, on: boolean): Promise<void> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSetListMember(id, username, on));
  return request<void>(`/api/v1/notes/lists/${id}/members/${encodeURIComponent(username)}`, {
    method: on ? "PUT" : "DELETE",
  });
}

export function listNoteListNotes(id: number, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockListNotes(id, page));
  return request<NoteFeed>(`/api/v1/notes/lists/${id}/notes?page=${page}&size=20`, { method: "GET" });
}

export function listNoteListMemberships(username: string): Promise<{ listIds: number[] }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockListMemberships(username));
  return request(`/api/v1/notes/list-memberships/${encodeURIComponent(username)}`, { method: "GET" });
}

export function listDirectNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockDirectNotes(page));
  return request<NoteFeed>(`/api/v1/notes/direct?page=${page}&size=20`, { method: "GET" });
}

export function listBookmarkedNotes(page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockBookmarkedNotes(page));
  return request<NoteFeed>(`/api/v1/notes/bookmarks?page=${page}&size=20`, { method: "GET" });
}

export function listNoteQuotes(id: number, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockNoteQuotes(id, page));
  return request<NoteFeed>(`/api/v1/public/notes/${id}/quotes?page=${page}&size=20`, {
    method: "GET",
  });
}

/** Notes that quote a post, newest first; `total` sizes the post's "notes" tab. */
export interface PostQuotes extends NoteFeed {
  total: number;
}

export function listPostQuotes(postId: number, page = 0): Promise<PostQuotes> {
  if (noteMocks) return Promise.resolve(noteMocks.mockPostQuotes(postId, page));
  return request<PostQuotes>(`/api/v1/public/posts/${postId}/quotes?page=${page}&size=20`, { method: "GET" });
}

/** Published blog posts that carry this note as a card, newest first. */
export function listQuotingPosts(id: number, page = 0): Promise<PublicFeedView> {
  if (noteMocks) return Promise.resolve(noteMocks.mockQuotingPosts(id, page));
  return request<PublicFeedView>(`/api/v1/public/notes/${id}/posts?page=${page}`, { method: "GET" });
}

/** Mastodon's edit history: the note as it reads now first, then each earlier version, newest first. */
export interface NoteHistory {
  noteId: number;
  versions: { body: string; contentWarning: string | null; sensitive: boolean; at: string | null }[];
}

export function getNoteHistory(id: number): Promise<NoteHistory> {
  if (noteMocks) return Promise.resolve(noteMocks.mockHistory(id));
  return request<NoteHistory>(`/api/v1/public/notes/${id}/history`, { method: "GET" });
}

export function setNotePin(id: number, on: boolean): Promise<{ pinned: boolean }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockPin(id, on));
  return request(`/api/v1/notes/${id}/pin`, { method: on ? "PUT" : "DELETE" });
}

export function setNoteBookmark(id: number, on: boolean): Promise<{ bookmarked: boolean }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockBookmark(id, on));
  return request(`/api/v1/notes/${id}/bookmark`, { method: on ? "PUT" : "DELETE" });
}

export function setConversationMuted(id: number, on: boolean): Promise<{ muted: boolean }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockConversationMute(id, on));
  return request(`/api/v1/notes/${id}/conversation-mute`, { method: on ? "PUT" : "DELETE" });
}

export interface NoteFeedPreferences {
  showReposts: boolean;
  /** Languages shown in All notes and Trending; empty shows every language (Mastodon's filter languages). */
  languages: string[];
}

export function getNoteFeedPreferences(): Promise<NoteFeedPreferences> {
  if (noteMocks) return Promise.resolve(noteMocks.mockFeedPreferences());
  return request("/api/v1/notes/feed-preferences", { method: "GET" });
}

export function setShowReposts(showReposts: boolean): Promise<NoteFeedPreferences> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSetShowReposts(showReposts));
  return request("/api/v1/notes/feed-preferences", { method: "PUT", body: { showReposts } });
}

export function setNoteLanguages(languages: string[]): Promise<NoteFeedPreferences> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSetLanguages(languages));
  return request("/api/v1/notes/feed-preferences", { method: "PUT", body: { languages } });
}

export function getRepostVisibility(username: string): Promise<{ hidden: boolean }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockRepostVisibility(username));
  return request(`/api/v1/notes/repost-visibility/${encodeURIComponent(username)}`, {
    method: "GET",
  });
}

export function setRepostsHidden(username: string, hidden: boolean): Promise<{ hidden: boolean }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSetRepostsHidden(username, hidden));
  return request(`/api/v1/notes/repost-visibility/${encodeURIComponent(username)}`, {
    method: hidden ? "PUT" : "DELETE",
  });
}

export type NoteFilterContext = "home" | "public" | "thread" | "account" | "notifications";

export interface NoteFilter {
  id: number;
  phrase: string;
  wholeWord: boolean;
  context: NoteFilterContext[];
  action: "warn" | "hide";
  expiresAt: string | null;
}

export interface NoteFilterDraft {
  phrase: string;
  wholeWord: boolean;
  context: NoteFilterContext[];
  action: "warn" | "hide";
  expiresIn: number | null;
}

export function listNoteFilters(): Promise<NoteFilter[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockFilters());
  return request("/api/v1/notes/filters", { method: "GET" });
}

export function saveNoteFilter(draft: NoteFilterDraft, id: number | null): Promise<NoteFilter> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSaveFilter(draft, id));
  return id === null
    ? request("/api/v1/notes/filters", { method: "POST", body: draft })
    : request(`/api/v1/notes/filters/${id}`, { method: "PUT", body: draft });
}

export function deleteNoteFilter(id: number): Promise<void> {
  if (noteMocks) return Promise.resolve(noteMocks.mockDeleteFilter(id));
  return request(`/api/v1/notes/filters/${id}`, { method: "DELETE" });
}

export interface MuteStatus {
  muted: boolean;
  notifications: boolean;
  expiresAt: string | null;
}

export function getMuteStatus(username: string): Promise<MuteStatus> {
  if (noteMocks) return Promise.resolve(noteMocks.mockMuteStatus(username));
  return request(`/api/v1/users/${encodeURIComponent(username)}/mute`, { method: "GET" });
}

/** `duration` in seconds; null mutes until undone, as on Mastodon. */
export function muteUser(
  username: string,
  notifications: boolean,
  duration: number | null,
): Promise<MuteStatus> {
  if (noteMocks) return Promise.resolve(noteMocks.mockMute(username, notifications, duration));
  return request(`/api/v1/users/${encodeURIComponent(username)}/mute`, {
    method: "PUT",
    body: { notifications, duration },
  });
}

export function unmuteUser(username: string): Promise<void> {
  if (noteMocks) return Promise.resolve(noteMocks.mockUnmute(username));
  return request(`/api/v1/users/${encodeURIComponent(username)}/mute`, { method: "DELETE" });
}

/** Client-side author page (carries the viewer's token, so likedByMe and the author's own counts
 *  come back filled in). */
export function listAuthorNotes(username: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockAuthorNotes(username, page));
  return request<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/notes?page=${page}&size=20`,
    { method: "GET" },
  );
}

export function listAuthorReposts(username: string, page = 0): Promise<NoteFeed> {
  if (noteMocks) return Promise.resolve(noteMocks.mockAuthorReposts(username, page));
  return request<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/reposts?page=${page}&size=20`,
    { method: "GET" },
  );
}

export function fetchAuthorReposts(username: string): Promise<FetchResult<NoteFeed>> {
  if (noteMocks) {
    return Promise.resolve({ ok: true, data: noteMocks.mockAuthorReposts(username, 0) });
  }
  return fetchPublic<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/reposts?page=0&size=20`,
  );
}

/** Server-side, anonymous first page for the public notes tab. */
export function fetchAuthorNotes(username: string): Promise<FetchResult<NoteFeed>> {
  if (noteMocks) return Promise.resolve({ ok: true, data: noteMocks.mockAuthorNotes(username, 0) });
  return fetchPublic<NoteFeed>(
    `/api/v1/public/profiles/${encodeURIComponent(username)}/notes?page=0&size=20`,
  );
}

/** Server-side, anonymous thread for the note page and its metadata. */
export function fetchNoteThread(id: number): Promise<FetchResult<NoteThread>> {
  if (noteMocks) {
    const thread = noteMocks.mockThread(id);
    return Promise.resolve(thread ? { ok: true, data: thread } : { ok: false, status: 404 });
  }
  return fetchPublic<NoteThread>(`/api/v1/public/notes/${id}`, { noStore: true });
}

export function getNoteThread(id: number): Promise<NoteThread> {
  if (noteMocks) {
    try {
      return Promise.resolve(noteMocks.mockViewerThread(id));
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return request<NoteThread>(`/api/v1/public/notes/${id}`, { method: "GET" });
}

/** Mastodon's scheduled statuses: kept as written and posted when due; failure names why one could not be. */
export interface ScheduledNote {
  id: number;
  scheduledAt: string;
  body: string | null;
  contentWarning: string | null;
  visibility: string | null;
  imageCount: number;
  poll: boolean;
  inReplyToId: number | null;
  quotedNoteId: number | null;
  quotedPostId: number | null;
  failure: string | null;
}

export function scheduleNote(draft: NoteDraft, scheduledAt: string): Promise<ScheduledNote> {
  if (noteMocks) return Promise.resolve(noteMocks.mockSchedule(draft, scheduledAt));
  return request<ScheduledNote>("/api/v1/notes/scheduled", {
    method: "POST",
    body: { note: draft, scheduledAt },
  });
}

export function listScheduledNotes(): Promise<ScheduledNote[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockScheduledNotes());
  return request<ScheduledNote[]>("/api/v1/notes/scheduled", { method: "GET" });
}

export function rescheduleNote(id: number, scheduledAt: string): Promise<ScheduledNote> {
  if (noteMocks) return Promise.resolve(noteMocks.mockReschedule(id, scheduledAt));
  return request<ScheduledNote>(`/api/v1/notes/scheduled/${id}`, {
    method: "PATCH",
    body: { scheduledAt },
  });
}

export async function cancelScheduledNote(id: number): Promise<void> {
  if (noteMocks) return noteMocks.mockCancelScheduled(id);
  await request<unknown>(`/api/v1/notes/scheduled/${id}`, { method: "DELETE" });
}

export function createNote(draft: NoteDraft): Promise<Note> {
  if (noteMocks) return Promise.resolve(noteMocks.mockCreate(draft));
  return request<Note>("/api/v1/notes", { method: "POST", body: draft });
}

/** Posts a thread in one go: the server chains each note as a reply to the one before, all or none. */
export function createThread(drafts: NoteDraft[]): Promise<Note[]> {
  if (noteMocks) return Promise.resolve(noteMocks.mockCreateThread(drafts));
  return request<Note[]>("/api/v1/notes/threads", { method: "POST", body: { notes: drafts } });
}

/** An empty contentWarning takes the warning off; the server turns sensitive on whenever one stays. */
export interface NoteEdit {
  body: string;
  contentWarning: string;
  sensitive: boolean;
}

export function editNote(id: number, edit: NoteEdit): Promise<Note> {
  if (noteMocks) return Promise.resolve(noteMocks.mockEdit(id, edit));
  return request<Note>(`/api/v1/notes/${id}`, { method: "PATCH", body: edit });
}

export function voteInPoll(id: number, choices: number[]): Promise<NotePoll> {
  if (noteMocks) return Promise.resolve(noteMocks.mockVote(id, choices));
  return request<NotePoll>(`/api/v1/notes/${id}/poll/votes`, { method: "POST", body: { choices } });
}

export function deleteNote(id: number): Promise<void> {
  if (noteMocks) return Promise.resolve(noteMocks.mockDelete(id));
  return request<void>(`/api/v1/notes/${id}`, { method: "DELETE" });
}

export function setNoteLike(id: number, on: boolean): Promise<{ liked: boolean; likeCount: number }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockLike(id, on));
  return request(`/api/v1/notes/${id}/like`, { method: on ? "PUT" : "DELETE" });
}

export function setNoteRepost(
  id: number,
  on: boolean,
): Promise<{ reposted: boolean; repostCount: number }> {
  if (noteMocks) return Promise.resolve(noteMocks.mockRepost(id, on));
  return request(`/api/v1/notes/${id}/repost`, { method: on ? "PUT" : "DELETE" });
}

export function likedNoteIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0 || USE_MOCKS) return Promise.resolve([]);
  return request<{ likedIds: number[] }>(`/api/v1/notes/like-status?ids=${ids.join(",")}`, {
    method: "GET",
  }).then((r) => r.likedIds);
}

/** presign → PUT straight to storage. Returns the key to name when posting, plus a preview URL. */
export async function uploadNoteImage(file: File): Promise<{ key: string; previewUrl: string }> {
  if (!file.type.startsWith("image/")) throw new NoteImageUploadError("not-image");
  if (USE_MOCKS) return { key: `note-images/mock/${file.name}`, previewUrl: URL.createObjectURL(file) };
  const safe = await stripImageMetadata(file);
  const presigned = await request<PresignedNoteImage>("/api/v1/notes/images/presign", {
    method: "POST",
    body: { contentType: safe.type },
  });
  if (safe.size > presigned.maxBytes) throw new NoteImageUploadError("too-large");
  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": safe.type },
    body: safe,
  });
  if (!put.ok) throw new NoteImageUploadError("upload-failed");
  return { key: presigned.key, previewUrl: presigned.publicUrl };
}

export function getFederationSettings(): Promise<FederationSettings> {
  if (noteMocks) return Promise.resolve(noteMocks.mockFederationSettings());
  return request<FederationSettings>("/api/v1/federation/settings", { method: "GET" });
}

export function updateFederationSettings(
  patch: Partial<Pick<FederationSettings, "enabled">> & { noticeSeen?: boolean },
): Promise<FederationSettings> {
  if (noteMocks) return Promise.resolve(noteMocks.mockUpdateFederationSettings(patch));
  return request<FederationSettings>("/api/v1/federation/settings", { method: "PUT", body: patch });
}
