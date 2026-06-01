import { describe, expect, it } from "vitest";
import { planEmbed } from "./post-embed";

describe("planEmbed", () => {
  it("returns null for empty / blank / invalid", () => {
    expect(planEmbed(null)).toBeNull();
    expect(planEmbed("")).toBeNull();
    expect(planEmbed("   ")).toBeNull();
    expect(planEmbed("not a url")).toBeNull();
    expect(planEmbed("ftp://example.com/x")).toBeNull();
  });

  it("frames a YouTube watch URL from JSON content", () => {
    const plan = planEmbed(JSON.stringify({ provider: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }));
    expect(plan).toEqual({ kind: "video", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", aspect: "16/9" });
  });

  it("frames a youtu.be short link and youtube /shorts and /embed", () => {
    expect(planEmbed("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({ kind: "video", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    expect(planEmbed("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toMatchObject({ kind: "video", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    expect(planEmbed("https://www.youtube.com/embed/dQw4w9WgXcQ")).toMatchObject({ kind: "video", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
  });

  it("frames a Vimeo URL", () => {
    expect(planEmbed("https://vimeo.com/123456789")).toEqual({ kind: "video", src: "https://player.vimeo.com/video/123456789", aspect: "16/9" });
    expect(planEmbed("https://player.vimeo.com/video/123456789")).toEqual({ kind: "video", src: "https://player.vimeo.com/video/123456789", aspect: "16/9" });
  });

  it("falls back to a link card for unknown providers", () => {
    expect(planEmbed("https://open.spotify.com/track/abc")).toEqual({ kind: "link", url: "https://open.spotify.com/track/abc" });
    expect(planEmbed(JSON.stringify({ url: "https://example.com/post" }))).toEqual({ kind: "link", url: "https://example.com/post" });
  });

  it("degrades a known host with a malformed id to a link card", () => {
    expect(planEmbed("https://youtu.be/!!!")).toEqual({ kind: "link", url: "https://youtu.be/!!!" });
    expect(planEmbed("https://vimeo.com/abc")).toEqual({ kind: "link", url: "https://vimeo.com/abc" });
  });

  it("parses a Google Maps place URL into a map plan with coords + label", () => {
    expect(
      planEmbed(
        "https://www.google.com/maps/place/%EB%88%84%EB%8D%B0%EC%9D%B4%ED%81%AC/@37.5219,127.0411,16z",
      ),
    ).toMatchObject({ kind: "map", lat: 37.5219, lng: 127.0411, label: "누데이크" });
  });

  it("falls back to a link card for a maps URL without coordinates", () => {
    expect(planEmbed("https://www.google.com/maps/search/coffee")).toEqual({
      kind: "link",
      url: "https://www.google.com/maps/search/coffee",
    });
  });
});
