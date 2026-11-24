// @vitest-environment node
import { readdirSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/.well-known/apple-app-site-association/route";
import { routing } from "@/i18n/routing";
import middleware from "@/middleware";
import { appLinkComponents, PROFILE_PAGE_NAMES } from "./app-site-association";

vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null) }));

const APP = path.resolve(__dirname, "../app/[locale]");
const AUTHOR = "p/[username]";
const ROOMS = "blog/rooms";
const IN_APP = new Set([AUTHOR, `${AUTHOR}/[slug]`, `${AUTHOR}/notes/[id]`, `${ROOMS}/join/[code]`]);
const SAMPLE: Record<string, string> = { "[slug]": "first-post", "[id]": "42", "[code]": "r100x" };
const PREFIXES = ["", ...routing.locales.map((locale) => `/${locale}`)];

function folders(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
}

function has(dir: string, file: RegExp): boolean {
  return readdirSync(dir).some((name) => file.test(name));
}

function routesUnder(route: string): string[] {
  const dir = path.join(APP, route);
  return [
    ...(has(dir, /^(page|route)\.tsx?$/) ? [route] : []),
    ...(has(dir, /^opengraph-image\.tsx?$/) ? [`${route}/opengraph-image`] : []),
    ...folders(dir).flatMap((name) => routesUnder(`${route}/${name}`)),
  ];
}

function address(route: string): string {
  return route
    .replace(AUTHOR, "/@dohyun")
    .replace(ROOMS, "/rooms")
    .replace(/\[\w+\]/g, (param) => {
      if (!SAMPLE[param]) throw new Error(`no sample value for ${param} in ${route}`);
      return SAMPLE[param];
    });
}

function landsOn(pathname: string): string | null {
  const res = middleware(new NextRequest(`https://blog.kurl.me${pathname}`, { headers: { host: "blog.kurl.me" } }));
  const rewritten = res.headers.get("x-middleware-rewrite");
  if (!rewritten) return null;
  const segments = new URL(rewritten).pathname.split("/").filter(Boolean).slice(1);
  let route = "";
  for (const [index, segment] of segments.entries()) {
    const here = path.join(APP, route);
    if (index === segments.length - 1 && segment === "opengraph-image" && has(here, /^opengraph-image\.tsx?$/)) {
      return `${route}/${segment}`;
    }
    const names = folders(here);
    const next = names.find((name) => name === segment) ?? names.find((name) => name.startsWith("["));
    if (!next) return null;
    route = route ? `${route}/${next}` : next;
  }
  return has(path.join(APP, route), /^(page|route)\.tsx?$/) ? route : null;
}

function pattern(glob: string): RegExp {
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${body}$`);
}

function opensInApp(address: string): boolean {
  const url = new URL(address, "https://blog.kurl.me");
  const first = appLinkComponents().find(
    (component) =>
      pattern(component["/"]).test(url.pathname) &&
      Object.entries(component["?"] ?? {}).every(([name, glob]) => pattern(glob).test(url.searchParams.get(name) ?? "")),
  );
  return first !== undefined && !first.exclude;
}

describe("the app link association file", () => {
  it("is served as JSON for the kurl app", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    const body = await res.json();
    expect(body.applinks.details).toHaveLength(1);
    expect(body.applinks.details[0].appIDs).toEqual(["5R78H9H4YU.focustime.kurl"]);
    expect(body.applinks.details[0].components).toEqual(appLinkComponents());
  });

  it("opens the profile, post, note and room invite pages in the app and leaves every other page under them to the browser", () => {
    const routes = [...routesUnder(AUTHOR), ...routesUnder(ROOMS)];
    expect(routes.filter((route) => IN_APP.has(route))).toHaveLength(IN_APP.size);
    for (const prefix of PREFIXES) {
      for (const route of routes) {
        const pathname = `${prefix}${address(route)}`;
        expect(landsOn(pathname), pathname).toBe(route);
        expect(opensInApp(pathname), pathname).toBe(IN_APP.has(route));
      }
    }
  });

  it("names every fixed page under an author, so none of them is taken for a post", () => {
    const fixed = [...folders(path.join(APP, AUTHOR)).filter((name) => !name.startsWith("[")), "opengraph-image"];
    expect([...PROFILE_PAGE_NAMES].sort()).toEqual(fixed.sort());
  });

  it("leaves the rest of the blog, other languages and deeper paths to the browser", () => {
    for (const pathname of [
      "/",
      "/ko",
      "/notes",
      "/tags/swift",
      "/write/new",
      "/remote/3/notes/5",
      "/ko/remote/3/notes/5",
      "/zz/@dohyun",
      "/zz/@dohyun/first-post",
      "/zz/rooms/join/r100x",
      "/rooms/join",
      "/rooms/join/",
      "/@dohyun/first-post/",
      "/@dohyun/first-post/comments",
      "/en/@dohyun/notes/42/",
      "/rooms/join/r100x/",
    ]) {
      expect(opensInApp(pathname), pathname).toBe(false);
    }
  });

  it("leaves a draft preview link to the browser and takes every other link to a post", () => {
    for (const prefix of PREFIXES) {
      const post = `${prefix}/@dohyun/first-post`;
      expect(opensInApp(`${post}?preview=t0ken`), post).toBe(false);
      expect(opensInApp(`${post}?k=key&preview=t0ken`), post).toBe(false);
      for (const query of ["", "?k=key", "?highlightId=7", "?hl=word", "?preview="]) {
        expect(opensInApp(`${post}${query}`), `${post}${query}`).toBe(true);
      }
    }
  });

  it("still opens a post whose slug only starts with a fixed page name", () => {
    for (const slug of ["about-me", "notes-on-swift", "series-finale", "feed-reader"]) {
      expect(opensInApp(`/@dohyun/${slug}`), slug).toBe(true);
    }
  });
});
