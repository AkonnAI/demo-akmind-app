/** Align with server `normalizeDemoToken` for cookies / URL params. */
export function normalizeClientDemoToken(raw: string): string {
  return raw.trim().toLowerCase();
}
