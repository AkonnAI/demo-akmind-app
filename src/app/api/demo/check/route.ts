import { fail, ok } from "@/lib/api-response";
import { hasUsedDemo } from "@/lib/demo-db";
import { emailSchema } from "@/lib/validators";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const parsed = emailSchema.safeParse({
    email: req.nextUrl.searchParams.get("email") ?? "",
  });
  if (!parsed.success) {
    return fail("Invalid input", 422);
  }

  const used = await hasUsedDemo(parsed.data.email);
  return ok({ hasUsedDemo: used });
}
