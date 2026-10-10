"use client";

import Image from "next/image";
import { imageUrl } from "@/lib/domain/images";
import { cn } from "@/lib/utils";

/** Unsplash-backed photo. The loader asks Unsplash's CDN for the exact width needed. */
export function Photo({
  src,
  alt,
  sizes = "200px",
  faces = false,
  className,
  priority,
}: {
  src: string;
  alt: string;
  sizes?: string;
  faces?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={imageUrl(src, 800, undefined, faces)}
      loader={({ src: url, width }) => url.replace(/w=\d+/, `w=${width}`)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
