import { DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS } from "@/lib/demo-session";
import { NextRequest, NextResponse } from "next/server";

function originAllowedForApi(origin: string): boolean {
  const allowed = [
    "https://www.akmind.com",
    "https://demo.akmind.com",
    "https://app.akmind.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://[::1]:3000",
    "http://[::1]:3001",
    "http://[::1]:3002",
  ];
  if (allowed.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    try {
      const u = new URL(origin);
      return (
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname === "[::1]"
      );
    } catch {
      return false;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") || "";

    if (origin !== "" && !originAllowedForApi(origin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > 10240) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": origin || "http://localhost:3000",
      Vary: "Origin",
    } as const;

    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  if (!pathname.startsWith("/demo")) {
    return NextResponse.next();
  }

  /** Query `token` wins so a fresh link overrides a stale cookie (e.g. admin dev token). */
  const token =
    req.nextUrl.searchParams.get("token") ||
    req.cookies.get("demo_token")?.value;

  if (!token) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("error", "no-token");
    redirectUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const res = NextResponse.next();
  res.cookies.set("demo_token", token, {
    maxAge: DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export const config = {
  matcher: ["/demo/:path*", "/api/:path*"],
};
