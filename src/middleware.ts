import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") || "";
    const allowed = [
      "https://www.akmind.com",
      "https://demo.akmind.com",
      "https://app.akmind.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ];

    if (origin !== "" && !allowed.includes(origin)) {
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

  const token =
    req.cookies.get("demo_token")?.value ||
    req.nextUrl.searchParams.get("token");

  if (!token) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("error", "no-token");
    redirectUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const res = NextResponse.next();
  res.cookies.set("demo_token", token, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export const config = {
  matcher: ["/demo/:path*", "/api/:path*"],
};
