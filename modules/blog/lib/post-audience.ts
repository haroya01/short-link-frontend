export type PostAudience = "PUBLIC" | "UNLISTED" | "FOLLOWERS" | "PASSWORD";

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

export type CardMark = "UNLISTED" | "FOLLOWERS" | "PASSWORD" | "REGION";

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

export function sameCountries(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((code, i) => code === right[i]);
}

export const MAX_BLOCKED_COUNTRIES = 85;
