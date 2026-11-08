export type SearchParams = Record<string, string | string[] | undefined>;

export function oldHandleRedirect(
  requested: string,
  current: string,
  locale: string,
  searchParams: SearchParams,
): string | null {
  if (current.toLowerCase() === requested.toLowerCase()) return null;
  return `/${locale}/u/${current}${queryOf(searchParams)}`;
}

function queryOf(searchParams: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const v of [value].flat()) if (v !== undefined) query.append(key, v);
  }
  const s = query.toString();
  return s ? `?${s}` : "";
}
