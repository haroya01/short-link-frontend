// Preview-only stub for next/navigation. The real hooks read the Next app-router
// context, which (a) isn't mounted in the preview/design runtime and (b) drags
// node-only build deps (gzip-size → fs/stream/zlib) into the browser bundle.
// Mapped in via .design-sync/tsconfig.json paths.
const router = {
  push: () => {},
  replace: () => {},
  prefetch: () => Promise.resolve(),
  back: () => {},
  forward: () => {},
  refresh: () => {},
};
export const useRouter = () => router;
export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export const redirect = () => {};
export const permanentRedirect = () => {};
export const notFound = () => {};
