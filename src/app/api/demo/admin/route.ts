import { fail, ok } from "@/lib/api-response";
import {
  getOrCreateAdminUser,
  updateDemoUser,
} from "@/lib/demo-db";
import { NextRequest } from "next/server";

export async function GET() {
  const admin = await getOrCreateAdminUser();
  return ok({
    token: admin.demoToken,
    accessUrl: `/?token=${encodeURIComponent(admin.demoToken)}`,
    course: admin.course,
  });
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const raw =
    typeof body === "object" &&
    body !== null &&
    "course" in body &&
    typeof (body as { course: unknown }).course === "string"
      ? (body as { course: string }).course
      : null;
  if (raw !== "AI Explorers" && raw !== "AI Builders") {
    return fail('course must be "AI Explorers" or "AI Builders"', 422);
  }
  const admin = await getOrCreateAdminUser();
  await updateDemoUser(admin.id, { course: raw });
  return ok({ course: raw });
}

export async function DELETE() {
  const admin = await getOrCreateAdminUser();
  await updateDemoUser(admin.id, {
    demoStarted: false,
    demoCompleted: false,
    lessonsComplete: [],
    quizScores: {},
    xp: 0,
    badgeEarned: false,
    earnedBadges: [],
  });
  return ok({ message: "Admin progress reset" });
}
