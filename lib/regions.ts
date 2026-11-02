/**
 * The backend sends a region as its English GeoIP name, with the ISO 3166-2 code beside it only on
 * responses from after the regionCode rollout.
 */

const JP_NAMES: Record<string, readonly string[]> = {
  "JP-01": ["Hokkaido"],
  "JP-02": ["Aomori"],
  "JP-03": ["Iwate"],
  "JP-04": ["Miyagi"],
  "JP-05": ["Akita"],
  "JP-06": ["Yamagata"],
  "JP-07": ["Fukushima"],
  "JP-08": ["Ibaraki"],
  "JP-09": ["Tochigi"],
  "JP-10": ["Gunma", "Gumma"],
  "JP-11": ["Saitama"],
  "JP-12": ["Chiba"],
  "JP-13": ["Tokyo"],
  "JP-14": ["Kanagawa"],
  "JP-15": ["Niigata"],
  "JP-16": ["Toyama"],
  "JP-17": ["Ishikawa"],
  "JP-18": ["Fukui"],
  "JP-19": ["Yamanashi"],
  "JP-20": ["Nagano"],
  "JP-21": ["Gifu"],
  "JP-22": ["Shizuoka"],
  "JP-23": ["Aichi"],
  "JP-24": ["Mie"],
  "JP-25": ["Shiga"],
  "JP-26": ["Kyoto"],
  "JP-27": ["Osaka"],
  "JP-28": ["Hyogo"],
  "JP-29": ["Nara"],
  "JP-30": ["Wakayama"],
  "JP-31": ["Tottori"],
  "JP-32": ["Shimane"],
  "JP-33": ["Okayama"],
  "JP-34": ["Hiroshima"],
  "JP-35": ["Yamaguchi"],
  "JP-36": ["Tokushima"],
  "JP-37": ["Kagawa"],
  "JP-38": ["Ehime"],
  "JP-39": ["Kochi"],
  "JP-40": ["Fukuoka"],
  "JP-41": ["Saga"],
  "JP-42": ["Nagasaki"],
  "JP-43": ["Kumamoto"],
  "JP-44": ["Oita"],
  "JP-45": ["Miyazaki"],
  "JP-46": ["Kagoshima"],
  "JP-47": ["Okinawa"],
};

const KR_NAMES: Record<string, readonly string[]> = {
  "KR-11": ["Seoul"],
  "KR-26": ["Busan", "Pusan"],
  "KR-27": ["Daegu", "Taegu"],
  "KR-28": ["Incheon", "Inchon"],
  "KR-29": ["Gwangju", "Kwangju"],
  "KR-30": ["Daejeon", "Taejon"],
  "KR-31": ["Ulsan"],
  "KR-41": ["Gyeonggi", "Kyonggi"],
  "KR-43": ["North Chungcheong", "Chungcheongbuk", "Chungbuk"],
  "KR-44": ["South Chungcheong", "Chungcheongnam", "Chungnam"],
  "KR-46": ["South Jeolla", "Jeollanam", "Jeonnam"],
  "KR-47": ["North Gyeongsang", "Gyeongsangbuk", "Gyeongbuk"],
  "KR-48": ["South Gyeongsang", "Gyeongsangnam", "Gyeongnam"],
  "KR-49": ["Jeju", "Cheju"],
  "KR-50": ["Sejong"],
  "KR-51": ["Gangwon", "Kangwon"],
  "KR-52": ["North Jeolla", "Jeollabuk", "Jeonbuk"],
};

/** Gangwon (2023) and Jeonbuk (2024) became special self-governing provinces and took new codes. */
const RENAMED_CODES: Readonly<Record<string, string>> = { "KR-42": "KR-51", "KR-45": "KR-52" };

const JP_SUFFIXES = ["", "ken", "to", "fu", "prefecture", "metropolis"];
const KR_SUFFIXES = [
  "",
  "do",
  "si",
  "province",
  "state",
  "metropolitancity",
  "specialcity",
  "specialselfgoverningcity",
  "specialselfgoverningprovince",
];

const normalize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const BY_NAME: ReadonlyMap<string, string> = new Map(
  [
    [JP_NAMES, JP_SUFFIXES] as const,
    [KR_NAMES, KR_SUFFIXES] as const,
  ].flatMap(([table, suffixes]) =>
    Object.entries(table).flatMap(([code, names]) =>
      names.flatMap((name) => suffixes.map((suffix) => [normalize(name) + suffix, code] as const)),
    ),
  ),
);

export const REGION_CODES: readonly string[] = [...Object.keys(JP_NAMES), ...Object.keys(KR_NAMES)];

export function regionCodeOf(region: string | null | undefined, regionCode?: string | null): string | null {
  if (regionCode) {
    const code = regionCode.trim().toUpperCase();
    const current = RENAMED_CODES[code] ?? code;
    return current in JP_NAMES || current in KR_NAMES ? current : null;
  }
  if (!region) return null;
  return BY_NAME.get(normalize(region)) ?? null;
}

export const regionMessageKey = (code: string) => code.replace("-", "");

export function mergeRegionClicks<T extends { region: string; regionCode?: string | null; count: number }>(
  rows: readonly T[],
): { region: string; code: string | null; count: number }[] {
  const merged = new Map<string, { region: string; code: string | null; count: number }>();
  for (const row of rows) {
    const code = regionCodeOf(row.region, row.regionCode);
    const key = code ?? `name:${row.region}`;
    const prev = merged.get(key);
    if (prev) prev.count += row.count;
    else merged.set(key, { region: row.region, code, count: row.count });
  }
  return [...merged.values()];
}
