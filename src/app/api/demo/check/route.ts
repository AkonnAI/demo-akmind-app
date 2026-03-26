import { fail, ok } from "@/lib/api-response";
import { hasUsedDemo } from "@/lib/demo-db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email?.trim()) {
    return fail("Email required");
  }

  const used = hasUsedDemo(email.trim());
  return ok({ hasUsedDemo: used });
}
