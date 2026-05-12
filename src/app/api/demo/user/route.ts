import { fail } from "@/lib/api-response";
import { DEMO_USER_API_RATE_LIMIT_PER_MINUTE } from "@/lib/demo-session";
import {
  getDemoUserByToken,
  getOrCreateAdminUser,
  normalizeDemoToken,
} from "@/lib/demo-db";
import { checkRateLimit, getIP } from "@/lib/rate-limit";
import { tokenSchema } from "@/lib/validators";
import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

const ADMIN_DEV_TOKEN = "admin-akmind-dev-2026";

function safeTokenCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.padEnd(64));
    const bufB = Buffer.from(b.padEnd(64));
    return timingSafeEqual(bufA, bufB) && a.length === b.length;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const ip = getIP(req);
  const { allowed } = checkRateLimit(
    ip,
    DEMO_USER_API_RATE_LIMIT_PER_MINUTE,
    60 * 1000,
  );
  if (!allowed) {
    return fail("Too many requests", 429);
  }

  const raw = req.nextUrl.searchParams.get("token");
  const parsed = tokenSchema.safeParse({ token: raw?.trim() ?? "" });
  if (!parsed.success) {
    return fail("Invalid input", 422);
  }
  // Stored tokens are always lowercased in createDemoUser; compare consistently.
  const token = normalizeDemoToken(parsed.data.token);

  const user =
    token === normalizeDemoToken(ADMIN_DEV_TOKEN)
      ? await getOrCreateAdminUser()
      : await getDemoUserByToken(token);
  if (!user || !safeTokenCompare(token, user.demoToken)) {
    await new Promise((r) => setTimeout(r, 200));
    return fail("Invalid token", 401);
  }

  return Response.json(
    {
      name: user.name,
      childName: user.childName,
      course: user.course,
      email: user.email,
      phone: user.phone,
      lessonsComplete: user.lessonsComplete,
      quizScores: user.quizScores,
      xp: user.xp,
      badgeEarned: user.badgeEarned,
      demoCompleted: user.demoCompleted,
      earnedBadges: user.earnedBadges ?? [],
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    }
  );
}
