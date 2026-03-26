import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/demo")) {
    return NextResponse.next();
  }

  const token =
    req.cookies.get("demo_token")?.value ||
    req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?error=no-token", req.url));
  }

  const res = NextResponse.next();
  if (!req.cookies.get("demo_token")) {
    res.cookies.set("demo_token", token, {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }
  return res;
}

export const config = {
  matcher: ["/demo/:path*"],
};
