import type { DemoUser } from "@/types/demo";
import { normalizeClientDemoToken } from "@/lib/demo-token-client";

const STORAGE_PREFIX = "demo_course_pref:";

export type DemoCourseTrack = "AI Explorers" | "AI Builders";

function prefKey(normalizedToken: string): string {
  return `${STORAGE_PREFIX}${normalizedToken}`;
}

/** Last explicit program choice after PATCH (admin demo); survives SPA navigations while Dynamo reads may lag. */
export function readDemoCoursePreference(rawToken: string): DemoCourseTrack | null {
  if (typeof sessionStorage === "undefined") return null;
  const v = sessionStorage.getItem(prefKey(normalizeClientDemoToken(rawToken)));
  if (v === "AI Explorers" || v === "AI Builders") return v;
  return null;
}

export function writeDemoCoursePreference(
  rawToken: string,
  course: DemoCourseTrack,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(prefKey(normalizeClientDemoToken(rawToken)), course);
}

/** Prefer session preference over API `course` when present (same browser tab/session). */
export function applyDemoCoursePreference<T extends DemoUser>(
  rawToken: string,
  user: T,
): T {
  const pref = readDemoCoursePreference(rawToken);
  if (!pref) return user;
  return { ...user, course: pref };
}
