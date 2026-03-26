import { fail, ok } from "@/lib/api-response";
import { getDemoUserByToken, updateDemoUser } from "@/lib/demo-db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    lessonId?: number;
    quizScore?: number;
    xp?: number;
  };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const { token, lessonId, quizScore, xp } = body;
  if (!token) return fail("token is required");
  if (lessonId === undefined || lessonId === null) {
    return fail("lessonId is required");
  }

  const user = getDemoUserByToken(token);
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

  updateDemoUser(user.id, {
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
