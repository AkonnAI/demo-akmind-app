import { fail, ok } from "@/lib/api-response";
import { getDemoUserByToken, updateDemoUser } from "@/lib/demo-db";
import { checkRateLimit, getIP } from "@/lib/rate-limit";
import { progressSchema } from "@/lib/validators";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed } = checkRateLimit(ip, 60, 60 * 1000);
  if (!allowed) {
    return fail("Too many requests", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid input", 422);
  }
  const { token, lessonId, quizScore, xp } = parsed.data;

  const user = await getDemoUserByToken(token);
  if (!user) {
    return fail("Invalid", 401);
  }

  const lessons = [...user.lessonsComplete];
  if (!lessons.includes(lessonId)) {
    lessons.push(lessonId);
  }

  const scores = { ...user.quizScores };
  if (quizScore !== undefined) {
    scores[String(lessonId)] = quizScore;
  }

  const newXP = user.xp + (xp ?? 0);
  const completed = lessons.length >= 4;
  const badge = completed;

  await updateDemoUser(user.id, {
    lessonsComplete: lessons,
    quizScores: scores,
    xp: newXP,
    demoCompleted: completed,
    badgeEarned: badge,
    demoStarted: true,
  });

  return ok({
    success: true,
    lessonsComplete: lessons,
    xp: newXP,
    demoCompleted: completed,
  });
}
