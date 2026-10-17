"use client";

import { useCallback, useSyncExternalStore, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import {
  hasImageVariants,
  imageVariantUrl,
  rememberVariantFailure,
  subscribeVariantFailures,
  variantFailed,
} from "@/lib/image-variant";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt"> & {
  src: string;
  alt: string;
  sizes?: string;
};

export function VariantImage({ src, alt, sizes, onError, ...rest }: Props) {
  const failed = useSyncExternalStore(
    subscribeVariantFailures,
    () => variantFailed(src),
    () => false,
  );
  const variant = !failed && hasImageVariants(src);
  const fallBack = useCallback(() => rememberVariantFailure(src), [src]);
  const brokenBeforeHydration = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) fallBack();
    },
    [fallBack],
  );

  if (!variant) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} onError={onError} {...rest} />;
  }
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.removeAttribute("data-loaded");
    fallBack();
  };
  const sourceWidth = Number(rest.width) || undefined;
  const narrow = sourceWidth !== undefined && sourceWidth <= 480;
  const srcSet =
    sizes && !narrow
      ? `${imageVariantUrl(src, 480)} 480w, ${imageVariantUrl(src, 1080)} ${Math.min(sourceWidth ?? 1080, 1080)}w`
      : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={brokenBeforeHydration}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      src={imageVariantUrl(src, narrow ? 480 : 1080)}
      alt={alt}
      onError={handleError}
      {...rest}
    />
  );
}
