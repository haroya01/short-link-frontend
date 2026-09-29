import type { MetadataRoute } from "next";

// W3C 스펙 모양(params = { title, text, url }) — Next 의 Manifest 타입은 params 를 배열로 잘못 정의해 캐스팅.
const shareTarget = {
  action: "/",
  method: "GET",
  params: { title: "shared_title", text: "shared_text", url: "shared_url" },
} as unknown as MetadataRoute.Manifest["share_target"];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kurl",
    short_name: "kurl",
    description: "URL shortener with click analytics",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    share_target: shareTarget,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
