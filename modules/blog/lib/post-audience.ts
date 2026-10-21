export type PostAudience = "PUBLIC" | "UNLISTED" | "FOLLOWERS" | "PASSWORD" | "ROOM";

export const POST_AUDIENCES: readonly PostAudience[] = ["PUBLIC", "UNLISTED", "FOLLOWERS", "PASSWORD"];

export type LockReason = "FOLLOWERS" | "PASSWORD" | "REGION" | "REGION_CHECK";

export interface PostLock {
  reason: LockReason;
}

export interface AudienceFields {
  audience?: PostAudience | null;
  locked?: PostLock | null;
  regionRestricted?: boolean | null;
}

export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 200;

export function audienceOf(item: AudienceFields): PostAudience {
  return item.audience ?? "PUBLIC";
}

export function isRedactedCard(item: AudienceFields): boolean {
  const audience = audienceOf(item);
  return item.locked != null || audience === "FOLLOWERS" || audience === "PASSWORD" || item.regionRestricted === true;
}

export function isIndexable(item: AudienceFields): boolean {
  return audienceOf(item) === "PUBLIC" && item.regionRestricted !== true && item.locked == null;
}

type CardShape = AudienceFields & {
  excerpt: string | null;
  ogImageUrl: string | null;
  thumbnailUrl?: string | null;
  tags: string[];
};

export function redactCard<T extends CardShape>(item: T): T {
  if (!isRedactedCard(item)) return item;
  return {
    ...item,
    excerpt: null,
    ogImageUrl: null,
    ...("thumbnailUrl" in item ? { thumbnailUrl: null } : {}),
    tags: [],
  };
}

export type CardMark = "UNLISTED" | "FOLLOWERS" | "PASSWORD" | "REGION" | "ROOM";

export function cardMark(item: AudienceFields): CardMark | null {
  const audience = audienceOf(item);
  const reason = item.locked?.reason;
  if (reason === "FOLLOWERS" || reason === "PASSWORD") return reason;
  if (audience === "FOLLOWERS" || audience === "PASSWORD") return audience;
  if (reason === "REGION" || reason === "REGION_CHECK" || item.regionRestricted === true) return "REGION";
  if (audience === "UNLISTED") return "UNLISTED";
  return null;
}

export type PasswordProblem = "required" | "length";

export function passwordProblem(
  audience: PostAudience,
  password: string,
  hasPassword: boolean,
): PasswordProblem | null {
  if (audience !== "PASSWORD") return null;
  if (password === "") return hasPassword ? null : "required";
  const length = [...password].length;
  return length < PASSWORD_MIN || length > PASSWORD_MAX ? "length" : null;
}

function sameCountries(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((code, i) => code === right[i]);
}

export const MAX_BLOCKED_COUNTRIES = 85;

export type AudienceDraft = {
  audience: PostAudience;
  password: string;
  blockedCountries: string[];
  roomId?: number | null;
};

export type SavedAudience = {
  audience?: PostAudience;
  hasPassword?: boolean;
  blockedCountries?: string[];
  room?: { id: number } | null;
};

export type AudiencePatch = { audience?: PostAudience; password?: string; blockedCountries?: string[]; roomId?: number };

export function audiencePatch(saved: SavedAudience, draft: AudienceDraft): AudiencePatch {
  const patch: AudiencePatch = {};
  const problem = passwordProblem(draft.audience, draft.password, saved.hasPassword === true);
  if (problem == null && draft.audience !== "ROOM" && draft.audience !== (saved.audience ?? "PUBLIC")) {
    patch.audience = draft.audience;
  }
  if (problem == null && draft.audience === "PASSWORD" && draft.password !== "") patch.password = draft.password;
  if (draft.audience === "ROOM" && draft.roomId != null && draft.roomId !== (saved.room?.id ?? null)) {
    patch.audience = "ROOM";
    patch.roomId = draft.roomId;
  }
  if (draft.audience === "ROOM") return patch;
  if (!sameCountries(draft.blockedCountries, saved.blockedCountries ?? [])) patch.blockedCountries = [...draft.blockedCountries];
  return patch;
}

export function changesVisibility(patch: AudiencePatch): boolean {
  return patch.audience !== undefined || patch.blockedCountries !== undefined;
}

export type ConditionPart =
  | { kind: "FOLLOWERS" | "UNLISTED" | "PASSWORD" | "REGION" | "ROOM" }
  | { kind: "COUNTRIES"; codes: string[] };

export function bylineCondition(
  post: AudienceFields & { blockedCountries?: string[] },
  { owner }: { owner: boolean },
): ConditionPart[] {
  if (post.locked != null) return [];
  const parts: ConditionPart[] = [];
  const audience = audienceOf(post);
  if (audience !== "PUBLIC") parts.push({ kind: audience });
  const codes = owner ? (post.blockedCountries ?? []) : [];
  if (codes.length > 0) parts.push({ kind: "COUNTRIES", codes: [...codes] });
  else if (post.regionRestricted === true) parts.push({ kind: "REGION" });
  return parts;
}
