import { describe, expect, it } from "vitest";
import { needsSharperImage, remotePreviewUrl } from "./remote-preview";

describe("remotePreviewUrl", () => {
  it("swaps a Mastodon original for its small preview, local or cached from another server", () => {
    expect(remotePreviewUrl("https://files.mastodon.social/media_attachments/files/117/536/041/202/441/643/original/ead1532ac11f7346.jpeg")).toBe(
      "https://files.mastodon.social/media_attachments/files/117/536/041/202/441/643/small/ead1532ac11f7346.jpeg",
    );
    expect(remotePreviewUrl("https://s3.fedibird.com/cache/media_attachments/files/117/535/857/415/963/935/original/f1171748534a7f3d.png")).toBe(
      "https://s3.fedibird.com/cache/media_attachments/files/117/535/857/415/963/935/small/f1171748534a7f3d.png",
    );
  });

  it("leaves everything else alone", () => {
    for (const url of [
      "https://files.mastodon.social/media_attachments/files/117/536/041/202/441/643/small/ead1532ac11f7346.jpeg",
      "https://files.mastodon.social/accounts/avatars/108/197/900/630/052/143/original/a.png",
      "https://misskey.example/files/webpublic-1234.webp",
      "https://d82putaebkgm4.cloudfront.net/note-images/a/b.jpg",
      "not a url",
    ]) {
      expect(remotePreviewUrl(url)).toBeNull();
    }
  });
});

describe("needsSharperImage", () => {
  const img = (natural: number, shown: number) =>
    ({ naturalWidth: natural, getBoundingClientRect: () => ({ width: shown }) }) as unknown as HTMLImageElement;

  it("asks for the original when the preview has fewer pixels than the slot shows", () => {
    expect(needsSharperImage(img(416, 310), 3)).toBe(true);
    expect(needsSharperImage(img(416, 310), 1)).toBe(false);
    expect(needsSharperImage(img(0, 310), 3)).toBe(false);
  });
});
