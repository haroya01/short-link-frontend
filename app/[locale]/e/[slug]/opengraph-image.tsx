import { ImageResponse } from "next/og";
import { OG, OgMark, loadAvatar, ogFonts } from "@/lib/og";
import { eventWhen, loadEvent } from "./_lib/load-event";

export const runtime = "nodejs";
export const alt = "kurl";
export const size = OG.size;
export const contentType = "image/png";

function clip(text: string, max: number): string {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : chars.join("");
}

export default async function EventOgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const result = await loadEvent(slug);
  const event = result.ok ? result.event : null;
  const cover = event?.coverImageUrl ? await loadAvatar(event.coverImageUrl) : null;
  const noStore = event ? {} : { headers: { "cache-control": "no-store" } };

  if (cover) {
    return new ImageResponse(
      (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={cover} width={size.width} height={size.height} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ),
      { ...size },
    );
  }

  const title = event ? clip(event.title, 30) : "kurl";
  const when = event ? await eventWhen(event, locale) : null;
  const lines = [when ? `${when.day} ${when.time}` : null, event?.locationText ? clip(event.locationText, 36) : null].filter(
    (line): line is string => Boolean(line),
  );

  return new ImageResponse(
    (
      <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 140, backgroundColor: OG.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <OgMark width={104} />
          <div style={{ display: "flex", fontFamily: "Pretendard", fontSize: 56, fontWeight: 700, letterSpacing: -1.5, color: OG.ink }}>
            kurl
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Pretendard", fontSize: 140, fontWeight: 700, letterSpacing: -4, lineHeight: 1.15, color: OG.ink }}>
            {title}
          </div>
          {lines.map((line) => (
            <div key={line} style={{ display: "flex", marginTop: 36, fontFamily: "Pretendard", fontSize: 64, fontWeight: 600, color: OG.mute }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts(`kurl ${title} ${lines.join(" ")}`), ...noStore },
  );
}
