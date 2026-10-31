"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { needsSharperImage, remotePreviewUrl } from "@/lib/remote-preview";
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
  sharpen?: boolean;
};

export function VariantImage({ src, alt, sizes, onError, sharpen = true, ...rest }: Props) {
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
    const preview = remotePreviewUrl(src);
    if (preview) return <RemotePreviewImage src={src} preview={preview} alt={alt} sharpen={sharpen} onError={onError} {...rest} />;
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

function RemotePreviewImage({
  src,
  preview,
  alt,
  sharpen,
  onError,
  onLoad,
  ...rest
}: Omit<Props, "sizes"> & { preview: string; sharpen: boolean }) {
  const previewFailed = useSyncExternalStore(
    subscribeVariantFailures,
    () => variantFailed(preview),
    () => false,
  );
  const [sharp, setSharp] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const shown = previewFailed || sharp ? src : preview;

  useEffect(() => {
    const img = ref.current;
    if (!img || shown !== preview) return;
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) {
      rememberVariantFailure(preview);
      return;
    }
    if (!sharpen) return;
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    const upgrade = () => {
      if (cancelled || !needsSharperImage(img, window.devicePixelRatio || 1)) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer?.disconnect();
          const full = new Image();
          full.onload = () => !cancelled && setSharp(true);
          full.src = src;
        },
        { rootMargin: "200px 0px" },
      );
      observer.observe(img);
    };
    const later = () => {
      if (cancelled) return;
      if (document.readyState !== "complete") {
        window.addEventListener("load", later, { once: true });
        return;
      }
      const ric = window.requestIdleCallback;
      if (typeof ric === "function") ric(upgrade, { timeout: 3000 });
      else window.setTimeout(upgrade, 500);
    };
    if (img.complete && img.naturalWidth > 0) later();
    else img.addEventListener("load", later, { once: true });
    return () => {
      cancelled = true;
      observer?.disconnect();
      img.removeEventListener("load", later);
      window.removeEventListener("load", later);
    };
  }, [src, preview, shown, sharpen]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={shown}
      alt={alt}
      onLoad={onLoad}
      onError={(event) => {
        if (shown === preview) rememberVariantFailure(preview);
        else onError?.(event);
      }}
      {...rest}
    />
  );
}
