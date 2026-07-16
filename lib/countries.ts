import { countryFlag, countryName } from "@/lib/utils";

/**
 * ISO 3166-1 alpha-2 country codes — the full standard set the backend accepts (@Pattern) and GeoIP
 * resolves. Only the codes are enumerated here (a fixed standard constant); the display NAMES are
 * never hardcoded — they come from Intl.DisplayNames per locale, and flags from codepoints
 * (lib/utils countryName / countryFlag). Mirrors the iOS CountryPicker (Locale.Region.isoRegions).
 */
export const ISO_COUNTRY_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

/**
 * A handful of commonly-picked countries surfaced at the top of the picker (before the full A→Z list).
 * These are the set the UI previously hardcoded — kept only as a convenience ordering, not as a limit.
 */
export const FREQUENT_COUNTRY_CODES: readonly string[] = [
  "KR", "JP", "US", "CN", "TW", "HK", "SG", "VN", "TH", "ID", "IN", "GB", "DE", "FR", "CA", "AU", "BR",
];

export interface CountryOption {
  code: string;
  /** Localized display name (Intl.DisplayNames); falls back to the code where unsupported. */
  name: string;
  /** Codepoint-derived flag emoji. */
  flag: string;
}

/** Build the localized, flag-annotated option list once, sorted A→Z by localized name. */
export function countryOptions(locale: string): CountryOption[] {
  return ISO_COUNTRY_CODES.map((code) => ({
    code,
    name: countryName(code, locale),
    flag: countryFlag(code),
  })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Case-insensitive match against a country's code or localized name — the picker's search filter. */
export function matchesCountryQuery(option: CountryOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return option.code.toLowerCase().includes(q) || option.name.toLowerCase().includes(q);
}
