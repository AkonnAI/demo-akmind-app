import { fail, ok } from "@/lib/api-response";
import { getDemoUserByToken } from "@/lib/demo-db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("token");
  const token = raw?.trim() ?? "";
  if (!token) {
    return fail("token is required");
  }

  const user = getDemoUserByToken(token);
  if (!user) {
    return fail("Invalid", 401);
  }

  return ok({
    name: user.name,
    childName: user.childName,
    email: user.email,
    phone: user.phone,
    lessonsComplete: user.lessonsComplete,
    quizScores: user.quizScores,
    xp: user.xp,
    badgeEarned: user.badgeEarned,
    demoCompleted: user.demoCompleted,
  });
}
