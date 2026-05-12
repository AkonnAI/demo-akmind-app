import { fail, ok } from "@/lib/api-response";
import {
  getDemoUserByToken,
  normalizeDemoToken,
  updateDemoUser,
} from "@/lib/demo-db";
import { DEMO_BADGES } from "@/lib/demo-badges";
import {
  allDemoLessonsComplete,
  sanitizeDemoLessonsComplete,
} from "@/lib/demo-lesson-scope";
import { sendDemoCompletionReport } from "@/lib/email";
import { checkRateLimit, getIP } from "@/lib/rate-limit";
import { progressSchema } from "@/lib/validators";
import type { DemoUser as ClientDemoUser } from "@/types/demo";
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
  } catch (err) {
    console.error("[api/demo/progress] Invalid JSON body", err);
    return fail("Invalid JSON body");
  }

  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid input", 422);
  }
  const { token, lessonId, quizScore, xp, badgesBefore = [] } = parsed.data;

  try {
    const normalizedToken = normalizeDemoToken(token);
    const user = await getDemoUserByToken(normalizedToken);
    if (!user) {
      return fail("Invalid", 401);
    }

    const merged = sanitizeDemoLessonsComplete([
      ...user.lessonsComplete,
      lessonId,
    ]);

    const scores = { ...user.quizScores };
    if (quizScore !== undefined) {
      scores[String(lessonId)] = quizScore;
    }

    const newXP = user.xp + (xp ?? 0);
    const completed = allDemoLessonsComplete(merged);
    const badge = completed;

    const userForBadges: ClientDemoUser = {
      name: user.name,
      childName: user.childName,
      course: user.course,
      email: user.email,
      phone: user.phone,
      lessonsComplete: merged,
      quizScores: scores,
      xp: newXP,
      badgeEarned: badge,
      demoCompleted: completed,
      earnedBadges: badgesBefore,
    };

    const badgesNow = DEMO_BADGES.filter((b) =>
      b.condition(userForBadges)
    ).map((b) => b.slug);
    const newBadges = badgesNow.filter((s) => !badgesBefore.includes(s));

    await updateDemoUser(user.id, {
      lessonsComplete: merged,
      quizScores: scores,
      xp: newXP,
      demoCompleted: completed,
      badgeEarned: badge,
      demoStarted: true,
      earnedBadges: badgesNow,
    });

    if (completed && badge) {
      void sendDemoCompletionReport({
        ...user,
        lessonsComplete: merged,
        quizScores: scores,
        xp: newXP,
        demoCompleted: true,
        badgeEarned: true,
        demoStarted: true,
        earnedBadges: badgesNow,
      });
    }

    return ok({
      success: true,
      xp: newXP,
      lessonsComplete: merged,
      quizScores: scores,
      badgeEarned: badge,
      demoCompleted: completed,
      earnedBadges: badgesNow,
      newBadges,
    });
  } catch (err) {
    console.error("[api/demo/progress] POST failed", err);
    return fail("Server error", 500);
  }
}
