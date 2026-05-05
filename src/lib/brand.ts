/** Public paths (files live under `public/brand/`). */
/** Full lockup (brain + AKMIND), generated from master `Brain Final.png` — see `npm run brand:wordmark-full`. */
export const BRAND_WORDMARK_PATH = "/brand/akmind-wordmark-full.png";
export const BRAIN_MARK_PATH = "/brand/brain-logo.png";

/**
 * Absolute URL for email `<img src>`. Requires `NEXT_PUBLIC_APP_URL` where emails are sent.
 */
export function getBrandLogoAbsoluteUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}${BRAND_WORDMARK_PATH}`;
}

/** Top-of-email centered logo block; empty string if no base URL configured. */
export function brandLogoEmailHtml(): string {
  const url = getBrandLogoAbsoluteUrl();
  if (!url) return "";
  return `<div style="text-align:center;margin:0 auto 20px;">
    <img src="${url}" alt="AKMIND" width="220" height="130" style="display:inline-block;max-width:220px;height:auto;border:0;" />
  </div>`;
}
