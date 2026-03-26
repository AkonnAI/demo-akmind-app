import { fail, ok } from "@/lib/api-response";
import { createDemoUser, generateDemoToken, hasUsedDemo } from "@/lib/demo-db";
import { sendAdminNotification, sendDemoLink } from "@/lib/email";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  let body: {
    parentName?: string;
    email?: string;
    phone?: string;
    childName?: string;
    presetToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const { parentName, email, phone, childName, presetToken } = body;
  if (!parentName?.trim()) return fail("parentName is required");
  if (!email?.trim()) return fail("email is required");
  if (!phone?.trim()) return fail("phone is required");
  if (!childName?.trim()) return fail("childName is required");

  if (hasUsedDemo(email)) {
    return fail("Demo already used", 409);
  }

  const token =
    typeof presetToken === "string" && presetToken.trim().length > 0
      ? presetToken.trim()
      : generateDemoToken();
  createDemoUser({
    email: email.trim(),
    name: parentName.trim(),
    childName: childName.trim(),
    phone: phone.trim(),
    demoToken: token,
    demoStarted: false,
    demoCompleted: false,
    lessonsComplete: [],
    quizScores: {},
    xp: 0,
    badgeEarned: false,
  });

  void sendDemoLink(email.trim(), parentName.trim(), childName.trim(), token);
  void sendAdminNotification(
    parentName.trim(),
    email.trim(),
    phone.trim(),
    childName.trim(),
    token
  );

  return ok({ success: true, token });
}
