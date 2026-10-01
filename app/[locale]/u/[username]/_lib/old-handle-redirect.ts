import { cardHref } from "@/lib/host";

export type SearchParams = Record<string, string | string[] | undefined>;

export function oldHandleRedirect(
  req: Pick<Headers, "get">,
  requested: string,
  current: string,
  locale: string,
  searchParams: SearchParams,
): string | null {
  if (current.toLowerCase() === requested.toLowerCase()) return null;
  // {user}.kurl.me 는 middleware.ts 가 모든 경로를 그 사람의 명함 아래로 rewrite 한다. 경로만 주면
  // /{locale}/u/{옛}/{locale}/u/{새} 로 풀려 404 가 된다.
  const base = req.get("x-original-host") ? cardHref(current, locale) : `/${locale}/u/${current}`;
  return `${base}${queryOf(searchParams)}`;
}

function queryOf(searchParams: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const v of [value].flat()) if (v !== undefined) query.append(key, v);
  }
  const s = query.toString();
  return s ? `?${s}` : "";
}
