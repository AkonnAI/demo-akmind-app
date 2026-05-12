import { fail, ok } from "@/lib/api-response";
import {
  createDemoUser,
  generateDemoToken,
  hasUsedDemo,
  normalizeDemoToken,
  type DemoUser,
} from "@/lib/demo-db";
import { sendAdminNotification, sendDemoLink } from "@/lib/email";
import { getIP, checkRateLimit } from "@/lib/rate-limit";
import { sanitizeString } from "@/lib/sanitize";
import { registerSchema } from "@/lib/validators";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("=== REGISTER [1/6] env ===", {
    USE_DYNAMODB: process.env.USE_DYNAMODB,
    TABLE_NAME_1: process.env.DEMO_USERS_TABLE,
    TABLE_NAME_2: process.env.DYNAMODB_DEMO_TABLE,
    TABLE_NAME_3: process.env.DYNAMODB_USERS_TABLE,
    AWS_REGION: process.env.AWS_REGION,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });

  const ip = getIP(req);
  const { allowed } = checkRateLimit(ip, 20, 60 * 60 * 1000);
  if (!allowed) {
    console.log("=== REGISTER rate-limited ===", { ip });
    return fail("Too many requests", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.log("=== REGISTER [2/6] body parse FAILED ===", err);
    return fail("Invalid JSON body");
  }
  console.log("=== REGISTER [2/6] raw body ===", JSON.stringify(body));

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    console.log("=== REGISTER [3/6] validation FAILED ===", JSON.stringify(parsed.error.flatten()));
    return fail("Invalid input", 422);
  }
  console.log("=== REGISTER [3/6] validation OK ===", JSON.stringify(parsed.data));

  const { parentName, email, phone, childName, presetToken, course: courseIn } =
    parsed.data;
  const parentNameSafe = sanitizeString(parentName);
  const emailSafe = sanitizeString(email).toLowerCase();
  const phoneSafe = sanitizeString(phone);
  const childNameSafe = sanitizeString(childName);
  const course: DemoUser["course"] = courseIn ?? "AI Explorers";

  console.log("=== REGISTER [4/6] checking hasUsedDemo ===", { emailSafe });
  try {
    if (await hasUsedDemo(emailSafe)) {
      console.log("=== REGISTER [4/6] hasUsedDemo=true — returning 409 ===");
      return fail("Demo already used", 409);
    }
    console.log("=== REGISTER [4/6] hasUsedDemo=false — proceeding ===");
  } catch (err) {
    console.log("=== REGISTER [4/6] hasUsedDemo threw ===", err);
    throw err;
  }

  const token =
    typeof presetToken === "string" && presetToken.trim().length > 0
      ? sanitizeString(presetToken.trim())
      : generateDemoToken();

  const userPayload = {
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
    course,
  };
  console.log("=== REGISTER [5/6] createDemoUser START ===", JSON.stringify({ ...userPayload, phone: "[redacted]" }));
  try {
    await createDemoUser(userPayload);
    console.log("=== REGISTER [5/6] createDemoUser OK ===");
  } catch (err) {
    console.log("=== REGISTER [5/6] createDemoUser THREW ===", err);
    throw err;
  }

  const tokenOut = normalizeDemoToken(token);
  void sendDemoLink(emailSafe, parentNameSafe, childNameSafe, tokenOut);
  void sendAdminNotification(
    parentNameSafe,
    emailSafe,
    phoneSafe,
    childNameSafe,
    tokenOut
  );

  console.log("=== REGISTER [6/6] responding 200 ===", { tokenOut });
  return ok({ success: true, token: tokenOut });
}
