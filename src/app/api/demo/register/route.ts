import { fail, ok } from "@/lib/api-response";
import {
  createDemoUser,
  generateDemoToken,
  hasUsedDemo,
  normalizeDemoToken,
} from "@/lib/demo-db";
import { sendAdminNotification, sendDemoLink } from "@/lib/email";
import { getIP, checkRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import { registerSchema } from "@/lib/validators";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("=== REGISTER DIAGNOSTIC ===", {
    USE_DYNAMODB: process.env.USE_DYNAMODB,
    TABLE_NAME_1: process.env.DEMO_USERS_TABLE,
    TABLE_NAME_2: process.env.DYNAMODB_DEMO_TABLE,
    TABLE_NAME_3: process.env.DYNAMODB_USERS_TABLE,
    AWS_REGION: process.env.AWS_REGION,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });

  const ip = getIP(req);
  const { allowed } = checkRateLimit(ip, 3, 60 * 60 * 1000);
  if (!allowed) {
    return fail("Too many requests", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid input", 422);
  }

  const { parentName, email, phone, childName, presetToken } = parsed.data;
  const parentNameSafe = sanitizeString(parentName);
  const emailSafe = sanitizeString(email).toLowerCase();
  const phoneSafe = sanitizeString(phone);
  const childNameSafe = sanitizeString(childName);

  if (await hasUsedDemo(emailSafe)) {
    return fail("Demo already used", 409);
  }

  const token =
    typeof presetToken === "string" && presetToken.trim().length > 0
      ? sanitizeString(presetToken.trim())
      : generateDemoToken();
  await createDemoUser({
    email: emailSafe,
    name: parentNameSafe,
    childName: childNameSafe,
    phone: phoneSafe,
    demoToken: normalizeDemoToken(token),
    demoStarted: false,
    demoCompleted: false,
    lessonsComplete: [],
    quizScores: {},
    xp: 0,
    badgeEarned: false,
    earnedBadges: [],
  });

  const tokenOut = normalizeDemoToken(token);
  void sendDemoLink(emailSafe, parentNameSafe, childNameSafe, tokenOut);
  void sendAdminNotification(
    parentNameSafe,
    emailSafe,
    phoneSafe,
    childNameSafe,
    tokenOut
  );

  return ok({ success: true, token: tokenOut });
}
