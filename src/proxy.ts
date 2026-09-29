import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/token";

/**
 * UX layer only: bounce visitors without a valid signed cookie to /login.
 * It does NOT decide roles — every page, action and service re-checks the session and role against the DB.
 */
export async function proxy(req: NextRequest) {
  const payload = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("x-robots-tag", "noindex, nofollow");
  res.headers.set("cache-control", "private, no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/business/dashboard/:path*"] };
