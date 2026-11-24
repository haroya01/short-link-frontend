import { routing } from "@/i18n/routing";

const APP_ID = "5R78H9H4YU.focustime.kurl";

export const WEB_ONLY_PROFILE_PAGES = ["about", "bookmarks", "feed", "liked", "opengraph-image", "tag_filter"] as const;

export interface LinkComponent {
  "/": string;
  "?"?: Record<string, string>;
  exclude?: true;
}

// Apple takes the first component that matches, and `*` runs across `/`, so every exclude sits
// above the broader pattern it carves out of.
function componentsUnder(prefix: string): LinkComponent[] {
  const open = (path: string): LinkComponent => ({ "/": `${prefix}${path}` });
  const web = (path: string): LinkComponent => ({ "/": `${prefix}${path}`, exclude: true });
  return [
    web("/rooms/join/*/*"),
    open("/rooms/join/?*"),
    web("/@*/notes/*/*"),
    open("/@*/notes/?*"),
    web("/@*/series/*/*"),
    open("/@*/series/?*"),
    web("/@*/*/*"),
    ...WEB_ONLY_PROFILE_PAGES.map((name) => web(`/@*/${name}`)),
    { ...web("/@*/?*"), "?": { preview: "?*" } },
    open("/@*/?*"),
    open("/@?*"),
  ];
}

export function appLinkComponents(): LinkComponent[] {
  return ["", ...routing.locales.map((locale) => `/${locale}`)].flatMap(componentsUnder);
}

export function appSiteAssociation() {
  return { applinks: { details: [{ appIDs: [APP_ID], components: appLinkComponents() }] } };
}
