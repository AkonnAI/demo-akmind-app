"use client";

import {
  AKMIND_WORDMARK_FULL_HEIGHT,
  AKMIND_WORDMARK_FULL_WIDTH,
} from "@/lib/akmind-wordmark-dimensions";
import { BRAIN_MARK_PATH, BRAND_WORDMARK_PATH } from "@/lib/brand";
import Image from "next/image";

type AkmindLogoProps = {
  className?: string;
  priority?: boolean;
  /** Brain mark only, or full lockup (brain + AKMIND word below). */
  variant?: "brain" | "wordmark";
};

export default function AkmindLogo({
  className = "h-9 w-auto max-w-[132px] object-contain object-left",
  priority = false,
  variant = "brain",
}: AkmindLogoProps) {
  const src = variant === "wordmark" ? BRAND_WORDMARK_PATH : BRAIN_MARK_PATH;
  const w = variant === "wordmark" ? AKMIND_WORDMARK_FULL_WIDTH : 384;
  const h = variant === "wordmark" ? AKMIND_WORDMARK_FULL_HEIGHT : 216;

  return (
    <Image
      src={src}
      alt="AKMIND"
      width={w}
      height={h}
      priority={priority}
      className={className}
    />
  );
}
