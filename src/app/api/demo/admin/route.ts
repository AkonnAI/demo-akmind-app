import { ok } from "@/lib/api-response";
import {
  getOrCreateAdminUser,
  updateDemoUser,
} from "@/lib/demo-db";

export async function GET() {
  const admin = await getOrCreateAdminUser();
  return ok({
    token: admin.demoToken,
    accessUrl: `/?token=${encodeURIComponent(admin.demoToken)}`,
  });
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
  });
  return ok({ message: "Admin progress reset" });
}
