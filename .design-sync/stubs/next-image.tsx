// Preview-only stub for next/image — renders a plain <img>, stripping the
// next/image-specific props so they don't hit the DOM. Mapped in via
// .design-sync/tsconfig.json paths.
import * as React from "react";

type ImgSrc = string | { src?: string; default?: { src?: string } };
type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: ImgSrc;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  loader?: unknown;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
  sizes?: string;
};

const Image = React.forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt, fill, priority, quality, loader, placeholder, blurDataURL, unoptimized, style, ...props },
  ref,
) {
  const s = typeof src === "string" ? src : src?.src ?? src?.default?.src ?? "";
  const fillStyle: React.CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style;
  return <img ref={ref} src={s} alt={alt ?? ""} style={fillStyle} {...props} />;
});

export default Image;
